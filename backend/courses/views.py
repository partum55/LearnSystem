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


class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for Course management."""

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['visibility', 'is_published', 'owner']

    def get_queryset(self):
        user = self.request.user
        # Allow anonymous users to see published public courses
        if not user.is_authenticated:
            return Course.objects.filter(visibility='PUBLIC', is_published=True)

        if user.role in ['SUPERADMIN', 'TEACHER']:
            return Course.objects.all()
        # Students see only their enrolled courses + public courses
        if user.is_authenticated:
            return Course.objects.filter(
                models.Q(members__user=user) | models.Q(visibility='PUBLIC', is_published=True)
            ).distinct()
        return Course.objects.none()

    def perform_create(self, serializer):
        # Only TEACHER and SUPERADMIN can create courses
        if self.request.user.role not in ['SUPERADMIN', 'TEACHER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and administrators can create courses.")
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def enroll_students(self, request, pk=None):
        """Enroll students to course (bulk operation)."""
        course = self.get_object()
        student_emails = request.data.get('student_emails', [])

        from users.models import User
        enrolled = []

        for email in student_emails:
            try:
                user = User.objects.get(email=email)
                member, created = CourseMember.objects.get_or_create(
                    course=course,
                    user=user,
                    defaults={
                        'role_in_course': 'STUDENT',
                        'added_by': request.user
                    }
                )
                if created:
                    enrolled.append(email)
            except User.DoesNotExist:
                pass

        return Response({'enrolled': enrolled})

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get course members."""
        course = self.get_object()
        members = course.members.all()
        serializer = CourseMemberSerializer(members, many=True)
        return Response(serializer.data)


class ModuleViewSet(viewsets.ModelViewSet):
    """ViewSet for Module management."""

    queryset = Module.objects.all()
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
        queryset = Module.objects.all()

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
        serializer.save(uploaded_by=self.request.user)


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
