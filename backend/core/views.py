"""Views for core models."""
from django.db import models
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    AuditLog,
    CalendarEvent,
    NotificationPreference,
    ContentVersion,
    Rubric,
    CannedResponse,
)
from .serializers import (
    AuditLogSerializer,
    CalendarEventSerializer,
    NotificationPreferenceSerializer,
    ContentVersionSerializer,
    RubricSerializer,
    CannedResponseSerializer,
)
from .permissions import RBACPermission
from .calendar_utils import iCalGenerator, sync_deadlines_to_calendar


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing audit logs (read-only)."""

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'resource_type', 'resource_id']
    search_fields = ['action', 'resource_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter audit logs based on user role."""
        user = self.request.user

        # Superadmins can see all logs
        if user.role == 'SUPERADMIN':
            return self.queryset

        # Teachers and TAs can see logs for their courses
        # For now, just show logs related to the user
        return self.queryset.filter(user=user)


class CalendarEventViewSet(viewsets.ModelViewSet):
    """ViewSet for managing calendar events."""

    queryset = CalendarEvent.objects.all()
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'event_type']
    search_fields = ['title', 'description']
    ordering_fields = ['start_time', 'end_time']
    ordering = ['start_time']

    def get_queryset(self):
        """Filter events by course membership."""
        user = self.request.user

        # Superadmins can see all events
        if user.role == 'SUPERADMIN':
            return self.queryset

        # Get courses where user is a member
        from courses.models import CourseMember
        user_courses = CourseMember.objects.filter(user=user).values_list('course', flat=True)

        return self.queryset.filter(course__in=user_courses)

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='export-ical')
    def export_ical(self, request):
        """Export calendar events as iCal file."""
        course_id = request.query_params.get('course')
        if not course_id:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from courses.models import Course
        try:
            course = Course.objects.get(id=course_id)
            events = self.get_queryset().filter(course=course)
            return iCalGenerator.generate_course_calendar(course, events)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'], url_path='sync-deadlines')
    def sync_deadlines(self, request):
        """Sync course assignments and quizzes to calendar events."""
        course_id = request.data.get('course_id')
        if not course_id:
            return Response(
                {'error': 'course_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from courses.models import Course
        try:
            course = Course.objects.get(id=course_id)
            created_count = sync_deadlines_to_calendar(course)
            return Response({
                'success': True,
                'created_count': created_count,
                'message': f'Synced {created_count} events to calendar'
            })
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification preferences."""

    queryset = NotificationPreference.objects.all()
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own preferences."""
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Set user to current user."""
        serializer.save(user=self.request.user)


class ContentVersionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing content versions (read-only)."""

    queryset = ContentVersion.objects.all()
    serializer_class = ContentVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['resource_type', 'resource_id']
    ordering_fields = ['version_number', 'created_at']
    ordering = ['-version_number']


class RubricViewSet(viewsets.ModelViewSet):
    """ViewSet for managing grading rubrics."""

    queryset = Rubric.objects.all()
    serializer_class = RubricSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course']
    search_fields = ['title']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter rubrics by course membership."""
        user = self.request.user

        # Superadmins can see all rubrics
        if user.role == 'SUPERADMIN':
            return self.queryset

        # Get courses where user is a member
        from courses.models import CourseMember
        user_courses = CourseMember.objects.filter(user=user).values_list('course', flat=True)

        return self.queryset.filter(course__in=user_courses)

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)


class CannedResponseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing canned responses (comment templates)."""

    queryset = CannedResponse.objects.all()
    serializer_class = CannedResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_public']
    search_fields = ['title', 'content']
    ordering_fields = ['title', 'created_at']
    ordering = ['title']

    def get_queryset(self):
        """Users can see their own responses and public responses."""
        user = self.request.user
        return self.queryset.filter(
            models.Q(user=user) | models.Q(is_public=True)
        )

    def perform_create(self, serializer):
        """Set user to current user."""
        serializer.save(user=self.request.user)
