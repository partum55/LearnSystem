from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Course, CourseMember, Module, Resource, Announcement
from .serializers import (
    CourseSerializer, CourseMemberSerializer, ModuleSerializer,
    ResourceSerializer, AnnouncementSerializer
)
from .permissions import IsCourseOwnerOrReadOnly
from core.bulk_operations import BulkOperationsMixin


class CourseViewSet(BulkOperationsMixin, viewsets.ModelViewSet):
    """ViewSet for Course management."""

    queryset = Course.objects.select_related('owner').prefetch_related('members__user')
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['visibility', 'is_published', 'owner']

    def get_queryset(self):
        user = self.request.user
        # Allow anonymous users to see published public courses
        if not user.is_authenticated:
            return Course.objects.filter(
                visibility='PUBLIC', is_published=True
            ).select_related('owner').prefetch_related('members__user')

        # SuperAdmins can see all courses
        if user.role == 'SUPERADMIN':
            return Course.objects.all().select_related('owner').prefetch_related('members__user')

        # Teachers see courses they own OR where they are members (as TEACHER or TA)
        if user.role == 'TEACHER':
            return Course.objects.filter(
                models.Q(owner=user) |
                models.Q(members__user=user, members__role_in_course__in=['TEACHER', 'TA'])
            ).distinct().select_related('owner').prefetch_related('members__user')

        # Students see only their enrolled courses + public published courses
        if user.is_authenticated:
            return Course.objects.filter(
                models.Q(members__user=user) | models.Q(visibility='PUBLIC', is_published=True)
            ).distinct().select_related('owner').prefetch_related('members__user')

        return Course.objects.none()

    def perform_create(self, serializer):
        # Only TEACHER and SUPERADMIN can create courses
        if self.request.user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can create courses.")
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def enroll_students(self, request, pk=None):
        """Enroll students to course (bulk operation via email list)."""
        course = self.get_object()

        # Check permissions
        if not hasattr(request.user, 'role') or request.user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can enroll students.")

        # Check if user is course owner or admin
        if request.user.role != 'SUPERADMIN' and course.owner != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only course owner or administrators can enroll students.")

        student_emails = request.data.get('student_emails', [])
        role = request.data.get('role', 'STUDENT')  # Allow enrolling TAs

        if role not in ['STUDENT', 'TA']:
            return Response({'error': 'Invalid role. Must be STUDENT or TA'}, status=status.HTTP_400_BAD_REQUEST)

        from users.models import User
        enrolled = []
        already_enrolled = []
        not_found = []

        for email in student_emails:
            email = email.strip().lower()
            if not email:
                continue

            try:
                user = User.objects.get(email=email)

                # Check if already enrolled
                existing = CourseMember.objects.filter(course=course, user=user).first()
                if existing:
                    already_enrolled.append({
                        'email': email,
                        'name': user.display_name,
                        'current_role': existing.role_in_course
                    })
                else:
                    member = CourseMember.objects.create(
                        course=course,
                        user=user,
                        role_in_course=role,
                        added_by=request.user
                    )
                    enrolled.append({
                        'email': email,
                        'name': user.display_name,
                        'role': role
                    })
            except User.DoesNotExist:
                not_found.append(email)

        return Response({
            'enrolled': enrolled,
            'already_enrolled': already_enrolled,
            'not_found': not_found,
            'total_enrolled': len(enrolled),
            'total_already_enrolled': len(already_enrolled),
            'total_not_found': len(not_found)
        })

    @action(detail=True, methods=['post'], url_path='enroll-csv')
    def enroll_csv(self, request, pk=None):
        """Enroll students from CSV file."""
        course = self.get_object()

        # Check permissions
        if not hasattr(request.user, 'role') or request.user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can enroll students.")

        if request.user.role != 'SUPERADMIN' and course.owner != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only course owner or administrators can enroll students.")

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import csv
            import io
            from users.models import User

            # Decode file
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            enrolled = []
            already_enrolled = []
            not_found = []
            created_users = []
            errors = []

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is 1)
                try:
                    email = row.get('email', '').strip().lower()
                    if not email:
                        errors.append({'row': row_num, 'error': 'Missing email'})
                        continue

                    role = row.get('role', 'STUDENT').upper()
                    if role not in ['STUDENT', 'TA']:
                        role = 'STUDENT'

                    # Try to get or create user
                    user, user_created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'display_name': row.get('name', email.split('@')[0]),
                            'role': role,
                            'locale': 'uk'
                        }
                    )

                    if user_created:
                        created_users.append({
                            'email': email,
                            'name': user.display_name
                        })

                    # Check if already enrolled
                    existing = CourseMember.objects.filter(course=course, user=user).first()
                    if existing:
                        already_enrolled.append({
                            'email': email,
                            'name': user.display_name,
                            'current_role': existing.role_in_course
                        })
                    else:
                        CourseMember.objects.create(
                            course=course,
                            user=user,
                            role_in_course=role,
                            added_by=request.user
                        )
                        enrolled.append({
                            'email': email,
                            'name': user.display_name,
                            'role': role
                        })

                except Exception as e:
                    errors.append({'row': row_num, 'error': str(e)})

            return Response({
                'enrolled': enrolled,
                'already_enrolled': already_enrolled,
                'created_users': created_users,
                'errors': errors,
                'total_enrolled': len(enrolled),
                'total_already_enrolled': len(already_enrolled),
                'total_created': len(created_users),
                'total_errors': len(errors)
            })

        except Exception as e:
            return Response({'error': f'Failed to process CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='unenroll')
    def unenroll_student(self, request, pk=None):
        """Remove a student from the course."""
        course = self.get_object()

        # Check permissions
        if not hasattr(request.user, 'role') or request.user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can unenroll students.")

        if request.user.role != 'SUPERADMIN' and course.owner != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only course owner or administrators can unenroll students.")

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = CourseMember.objects.get(course=course, user_id=user_id)
            member.delete()
            return Response({'message': 'Student unenrolled successfully'})
        except CourseMember.DoesNotExist:
            return Response({'error': 'Student not enrolled in this course'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get course members."""
        course = self.get_object()

        # Filter by role if provided
        role = request.query_params.get('role')
        members = course.members.all()

        if role:
            members = members.filter(role_in_course=role.upper())

        members = members.select_related('user').order_by('role_in_course', 'user__display_name')

        # Serialize and return the data
        serializer = CourseMemberSerializer(members, many=True)
        return Response(serializer.data)


class ModuleViewSet(viewsets.ModelViewSet):
    """ViewSet for Module management."""

    queryset = Module.objects.select_related('course', 'course__owner').prefetch_related('resources')
    serializer_class = ModuleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'is_published']
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        # For list/retrieve, allow read-only access
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        # For create/update/delete, require authentication
        return [permissions.IsAuthenticated()]

    def options(self, request, *args, **kwargs):
        """
        Handler for OPTIONS requests.
        Override to ensure POST is always included in Allow header.
        """
        response = super().options(request, *args, **kwargs)
        # Get current allowed methods
        if hasattr(response, 'data') and 'actions' in response.data:
            # Add POST/create action to metadata
            if 'POST' not in response.data.get('actions', {}):
                response.data['actions']['POST'] = {
                    'fields': self.get_serializer().fields
                }
        # Also ensure Allow header includes POST
        if 'Allow' in response:
            methods = [m.strip() for m in response['Allow'].split(',')]
            if 'POST' not in methods:
                methods.insert(1, 'POST')  # Insert after GET
                response['Allow'] = ', '.join(methods)
        return response

    def get_queryset(self):
        """Filter modules based on user role and publication status."""
        user = self.request.user
        queryset = Module.objects.select_related('course', 'course__owner').prefetch_related('resources')

        # Allow anonymous users to see published modules in public courses
        if not user.is_authenticated:
            return queryset.filter(
                is_published=True,
                course__visibility='PUBLIC',
                course__is_published=True
            )

        if hasattr(user, 'role') and user.role in ['SUPERADMIN', 'TEACHER']:
            return queryset

        # Students only see published modules in their courses or public courses
        return queryset.filter(
            models.Q(
                is_published=True,
                course__members__user=user
            ) | models.Q(
                is_published=True,
                course__visibility='PUBLIC',
                course__is_published=True
            )
        ).distinct()

    def perform_create(self, serializer):
        """Auto-set position if not provided."""
        # Check if user has permission to create modules
        user = self.request.user
        if not hasattr(user, 'role') or user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can create modules.")

        course_id = self.request.data.get('course')
        if course_id:
            last_position = Module.objects.filter(course_id=course_id).aggregate(
                models.Max('position')
            )['position__max'] or 0
            serializer.save(position=last_position + 1)
        else:
            serializer.save()

    @action(detail=True, methods=['get'])
    def assignments(self, request, pk=None):
        """Get all assignments for this module."""
        module = self.get_object()
        from django.apps import apps
        Assignment = apps.get_model('assessments', 'Assignment')

        assignments = Assignment.objects.filter(module=module).select_related(
            'course', 'created_by', 'quiz', 'module'
        ).prefetch_related('submissions').order_by('position')

        # Import serializer dynamically to avoid circular imports
        from assessments.serializers import AssignmentSerializer
        serializer = AssignmentSerializer(assignments, many=True, context={'request': request})
        return Response(serializer.data)


class ResourceViewSet(viewsets.ModelViewSet):
    """ViewSet for Resource management."""

    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['module', 'resource_type']

    def get_permissions(self):
        """Only authenticated users can create/modify resources."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        """Filter resources based on user access to modules."""
        user = self.request.user
        queryset = Resource.objects.all()

        # Allow anonymous users to see resources in public modules
        if not user.is_authenticated:
            return queryset.filter(
                module__is_published=True,
                module__course__visibility='PUBLIC',
                module__course__is_published=True
            )

        if user.is_authenticated and hasattr(user, 'role'):
            if user.role in ['SUPERADMIN', 'TEACHER']:
                return queryset

        # Students see resources in their enrolled courses or public courses
        return queryset.filter(
            models.Q(
                module__is_published=True,
                module__course__members__user=user
            ) | models.Q(
                module__is_published=True,
                module__course__visibility='PUBLIC',
                module__course__is_published=True
            )
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'role') or user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can upload resources.")

        # Auto-set position if not provided
        module_id = self.request.data.get('module')
        if module_id:
            last_position = Resource.objects.filter(module_id=module_id).aggregate(
                models.Max('position')
            )['position__max'] or 0
            serializer.save(uploaded_by=self.request.user, position=last_position + 1)
        else:
            serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_file(self, request):
        """Handle file upload for resources."""
        user = request.user
        if not hasattr(user, 'role') or user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can upload resources.")

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        module_id = request.data.get('module')
        title = request.data.get('title', file.name)
        description = request.data.get('description', '')
        resource_type = request.data.get('resource_type', 'OTHER')

        if not module_id:
            return Response({'error': 'Module ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if module exists and user has access
        try:
            module = Module.objects.get(id=module_id)
            if user.role != 'SUPERADMIN' and module.course.owner != user:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        except Module.DoesNotExist:
            return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get last position
        last_position = Resource.objects.filter(module_id=module_id).aggregate(
            models.Max('position')
        )['position__max'] or 0

        # Create resource
        resource = Resource.objects.create(
            module=module,
            title=title,
            description=description,
            resource_type=resource_type,
            file=file,
            position=last_position + 1,
            uploaded_by=user
        )

        serializer = ResourceSerializer(resource)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reorder')
    def reorder(self, request, pk=None):
        """Reorder resources within a module."""
        resource = self.get_object()
        new_position = request.data.get('position')

        if new_position is None:
            return Response({'error': 'Position is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Update positions
        resources = Resource.objects.filter(module=resource.module).exclude(id=resource.id).order_by('position')
        resource.position = new_position
        resource.save()

        # Reorder others
        position = 0
        for res in resources:
            if position == new_position:
                position += 1
            res.position = position
            res.save()
            position += 1

        return Response({'status': 'success'})

class AnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for Announcement management."""

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'is_pinned']
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        """Only authenticated users can create/modify announcements."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        """Filter announcements based on user access to courses."""
        user = self.request.user
        queryset = Announcement.objects.all()

        # Allow anonymous users to see announcements in public courses
        if not user.is_authenticated:
            return queryset.filter(
                course__visibility='PUBLIC',
                course__is_published=True
            )

        if user.is_authenticated and hasattr(user, 'role'):
            if user.role in ['SUPERADMIN', 'TEACHER']:
                return queryset

        # Students see announcements in their enrolled courses or public courses
        return queryset.filter(
            models.Q(course__members__user=user) |
            models.Q(course__visibility='PUBLIC', course__is_published=True)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'role') or user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can create announcements.")
        serializer.save(author=self.request.user)
