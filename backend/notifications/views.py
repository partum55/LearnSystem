from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Notification management."""

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['notification_type', 'is_read']

    def get_queryset(self):
        # Users only see their own notifications
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all user's notifications as read."""
        updated = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

        return Response({'marked_read': updated})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()

        return Response({'unread_count': count})

    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        """Delete all read notifications."""
        deleted = Notification.objects.filter(
            user=request.user,
            is_read=True
        ).delete()[0]

        return Response({'deleted': deleted})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for NotificationPreference management."""

    queryset = NotificationPreference.objects.all()
    serializer_class = NotificationPreferenceSerializer

    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_preferences(self, request):
        """Get or update current user's notification preferences."""
        preference, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )

        if request.method == 'GET':
            serializer = self.get_serializer(preference)
            return Response(serializer.data)

        else:  # PUT or PATCH
            serializer = self.get_serializer(
                preference,
                data=request.data,
                partial=(request.method == 'PATCH')
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

