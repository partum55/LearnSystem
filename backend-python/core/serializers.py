"""Serializers for core models."""
from rest_framework import serializers
from .models import (
    AuditLog,
    CalendarEvent,
    NotificationPreference,
    ContentVersion,
    Rubric,
    CannedResponse,
)


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""

    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_email',
            'action',
            'resource_type',
            'resource_id',
            'old_value',
            'new_value',
            'ip_address',
            'user_agent',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CalendarEventSerializer(serializers.ModelSerializer):
    """Serializer for CalendarEvent model."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id',
            'course',
            'title',
            'description',
            'event_type',
            'related_id',
            'start_time',
            'end_time',
            'recurrence_rule',
            'created_by',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        """Validate that start_time is before end_time."""
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time.'
                })
        return data


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreference model."""

    class Meta:
        model = NotificationPreference
        fields = [
            'user',
            'email_enabled',
            'push_enabled',
            'in_app_enabled',
            'digest_frequency',
            'event_types',
        ]


class ContentVersionSerializer(serializers.ModelSerializer):
    """Serializer for ContentVersion model."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ContentVersion
        fields = [
            'id',
            'resource_type',
            'resource_id',
            'version_number',
            'content_snapshot',
            'created_by',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class RubricSerializer(serializers.ModelSerializer):
    """Serializer for Rubric model."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Rubric
        fields = [
            'id',
            'course',
            'title',
            'criteria',
            'created_by',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_criteria(self, value):
        """Validate rubric criteria structure."""
        if not isinstance(value, list):
            raise serializers.ValidationError('Criteria must be a list.')

        for criterion in value:
            if not isinstance(criterion, dict):
                raise serializers.ValidationError('Each criterion must be a dictionary.')

            required_fields = ['name', 'description', 'levels']
            for field in required_fields:
                if field not in criterion:
                    raise serializers.ValidationError(f'Criterion missing required field: {field}')

            if not isinstance(criterion['levels'], list):
                raise serializers.ValidationError('Levels must be a list.')

            for level in criterion['levels']:
                if not isinstance(level, dict):
                    raise serializers.ValidationError('Each level must be a dictionary.')
                if 'points' not in level or 'description' not in level:
                    raise serializers.ValidationError('Level missing points or description.')

        return value


class CannedResponseSerializer(serializers.ModelSerializer):
    """Serializer for CannedResponse model."""

    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = CannedResponse
        fields = [
            'id',
            'user',
            'user_name',
            'title',
            'content',
            'is_public',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
