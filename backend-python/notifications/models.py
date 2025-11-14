import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    """User notification model."""

    NOTIFICATION_TYPES = [
        ('ASSIGNMENT_CREATED', 'Assignment Created'),
        ('ASSIGNMENT_DUE_SOON', 'Assignment Due Soon'),
        ('ASSIGNMENT_GRADED', 'Assignment Graded'),
        ('QUIZ_AVAILABLE', 'Quiz Available'),
        ('QUIZ_GRADED', 'Quiz Graded'),
        ('COURSE_ANNOUNCEMENT', 'Course Announcement'),
        ('COURSE_ENROLLED', 'Course Enrolled'),
        ('SUBMISSION_COMMENT', 'Submission Comment'),
        ('GRADE_UPDATED', 'Grade Updated'),
        ('SYSTEM', 'System Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    notification_type = models.CharField(_('type'), max_length=50, choices=NOTIFICATION_TYPES)

    title = models.CharField(_('title'), max_length=255)
    message = models.TextField(_('message'))

    # Payload for additional data (course_id, assignment_id, etc.)
    payload = models.JSONField(_('payload'), default=dict, blank=True)

    # Link to related object
    link = models.CharField(_('link'), max_length=500, blank=True)

    is_read = models.BooleanField(_('read'), default=False)
    read_at = models.DateTimeField(_('read at'), null=True, blank=True)

    # Delivery channels
    sent_email = models.BooleanField(_('sent via email'), default=False)
    sent_push = models.BooleanField(_('sent via push'), default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class NotificationPreference(models.Model):
    """User notification preferences."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    # Email notifications
    email_assignment_created = models.BooleanField(_('email: assignment created'), default=True)
    email_assignment_due_soon = models.BooleanField(_('email: assignment due soon'), default=True)
    email_assignment_graded = models.BooleanField(_('email: assignment graded'), default=True)
    email_quiz_available = models.BooleanField(_('email: quiz available'), default=True)
    email_quiz_graded = models.BooleanField(_('email: quiz graded'), default=True)
    email_announcements = models.BooleanField(_('email: announcements'), default=True)

    # In-app notifications
    app_assignment_created = models.BooleanField(_('app: assignment created'), default=True)
    app_assignment_due_soon = models.BooleanField(_('app: assignment due soon'), default=True)
    app_assignment_graded = models.BooleanField(_('app: assignment graded'), default=True)
    app_quiz_available = models.BooleanField(_('app: quiz available'), default=True)
    app_quiz_graded = models.BooleanField(_('app: quiz graded'), default=True)
    app_announcements = models.BooleanField(_('app: announcements'), default=True)

    # Digest settings
    daily_digest = models.BooleanField(_('daily digest'), default=False)
    weekly_digest = models.BooleanField(_('weekly digest'), default=False)

    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('notification preference')
        verbose_name_plural = _('notification preferences')

    def __str__(self):
        return f"Preferences for {self.user.email}"
