from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'notification_type', 'title', 'message',
            'payload', 'link', 'is_read', 'read_at', 'sent_email',
            'sent_push', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'sent_email', 'sent_push', 'created_at', 'read_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreference model."""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'email_assignment_created', 'email_assignment_due_soon',
            'email_assignment_graded', 'email_quiz_available',
            'email_quiz_graded', 'email_announcements',
            'app_assignment_created', 'app_assignment_due_soon',
            'app_assignment_graded', 'app_quiz_available',
            'app_quiz_graded', 'app_announcements',
            'daily_digest', 'weekly_digest', 'updated_at'
        ]
        read_only_fields = ['updated_at']

