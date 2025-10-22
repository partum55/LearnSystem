"""Core models for audit logging, versioning, and other system-wide functionality."""
import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """Audit log for tracking important system events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )

    action = models.CharField(_('action'), max_length=50)
    resource_type = models.CharField(_('resource type'), max_length=50)
    resource_id = models.UUIDField(_('resource ID'))

    old_value = models.JSONField(_('old value'), null=True, blank=True)
    new_value = models.JSONField(_('new value'), null=True, blank=True)

    ip_address = models.GenericIPAddressField(_('IP address'), null=True, blank=True)
    user_agent = models.TextField(_('user agent'), blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('audit log')
        verbose_name_plural = _('audit logs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.action} on {self.resource_type} by {self.user}"


class CalendarEvent(models.Model):
    """Calendar events for courses (assignments, quizzes, lectures, etc.)."""

    EVENT_TYPE_CHOICES = [
        ('assignment', 'Assignment'),
        ('quiz', 'Quiz'),
        ('lecture', 'Lecture'),
        ('office_hours', 'Office Hours'),
        ('exam', 'Exam'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='calendar_events'
    )

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)

    event_type = models.CharField(_('event type'), max_length=50, choices=EVENT_TYPE_CHOICES)
    related_id = models.UUIDField(
        _('related ID'),
        null=True,
        blank=True,
        help_text=_('ID of related assignment or quiz')
    )

    start_time = models.DateTimeField(_('start time'))
    end_time = models.DateTimeField(_('end time'))

    recurrence_rule = models.CharField(
        _('recurrence rule'),
        max_length=255,
        blank=True,
        help_text=_('iCal RRULE format')
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_events'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('calendar event')
        verbose_name_plural = _('calendar events')
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['course', 'start_time']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        return f"{self.title} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"


class NotificationPreference(models.Model):
    """User notification preferences."""

    DIGEST_FREQUENCY_CHOICES = [
        ('immediate', 'Immediate'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('never', 'Never'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='notification_preference'
    )

    email_enabled = models.BooleanField(_('email enabled'), default=True)
    push_enabled = models.BooleanField(_('push enabled'), default=False)
    in_app_enabled = models.BooleanField(_('in-app enabled'), default=True)

    digest_frequency = models.CharField(
        _('digest frequency'),
        max_length=20,
        choices=DIGEST_FREQUENCY_CHOICES,
        default='immediate'
    )

    event_types = models.JSONField(
        _('event types'),
        default=list,
        blank=True,
        help_text=_('Array of event types to subscribe to')
    )

    class Meta:
        verbose_name = _('notification preference')
        verbose_name_plural = _('notification preferences')

    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class ContentVersion(models.Model):
    """Version control for content (assignments, quizzes, modules)."""

    RESOURCE_TYPE_CHOICES = [
        ('assignment', 'Assignment'),
        ('quiz', 'Quiz'),
        ('module', 'Module'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource_type = models.CharField(_('resource type'), max_length=50, choices=RESOURCE_TYPE_CHOICES)
    resource_id = models.UUIDField(_('resource ID'))

    version_number = models.IntegerField(_('version number'))
    content_snapshot = models.JSONField(_('content snapshot'))

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='content_versions'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('content version')
        verbose_name_plural = _('content versions')
        ordering = ['-version_number']
        unique_together = [['resource_type', 'resource_id', 'version_number']]
        indexes = [
            models.Index(fields=['resource_type', 'resource_id', '-version_number']),
        ]

    def __str__(self):
        return f"{self.resource_type} {self.resource_id} v{self.version_number}"


class Rubric(models.Model):
    """Grading rubric for assignments."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='rubrics'
    )

    title = models.CharField(_('title'), max_length=255)
    criteria = models.JSONField(
        _('criteria'),
        help_text=_('Array of criteria with name, description, and levels')
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_rubrics'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('rubric')
        verbose_name_plural = _('rubrics')
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class CannedResponse(models.Model):
    """Pre-written comment templates for grading."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='canned_responses'
    )

    title = models.CharField(_('title'), max_length=255)
    content = models.TextField(_('content'))

    is_public = models.BooleanField(
        _('public'),
        default=False,
        help_text=_('Whether other instructors can use this template')
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('canned response')
        verbose_name_plural = _('canned responses')
        ordering = ['title']

    def __str__(self):
        return self.title
