import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Submission(models.Model):
    """Student submission for assignments."""

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('GRADED', 'Graded'),
        ('RETURNED', 'Returned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        'assessments.Assignment',
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submissions'
    )

    status = models.CharField(_('status'), max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    # Text answer
    text_answer = models.TextField(_('text answer'), blank=True)

    # Submitted files metadata
    files = models.JSONField(_('files'), default=list, blank=True)

    # External URL submission (e.g., GitHub, Google Docs)
    submission_url = models.URLField(_('submission URL'), blank=True, null=True)

    # Submission metadata
    metadata = models.JSONField(_('metadata'), default=dict, blank=True)

    # Grading
    grade = models.DecimalField(_('grade'), max_digits=6, decimal_places=2, null=True, blank=True)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='graded_submissions'
    )
    graded_at = models.DateTimeField(_('graded at'), null=True, blank=True)

    feedback = models.TextField(_('feedback'), blank=True)

    # Rubric evaluation
    rubric_evaluation = models.JSONField(_('rubric evaluation'), default=dict, blank=True)

    # Timestamps
    submitted_at = models.DateTimeField(_('submitted at'), null=True, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Late submission tracking
    is_late = models.BooleanField(_('late submission'), default=False)
    days_late = models.IntegerField(_('days late'), default=0)

    class Meta:
        verbose_name = _('submission')
        verbose_name_plural = _('submissions')
        ordering = ['-submitted_at']
        unique_together = [['assignment', 'user']]
        indexes = [
            models.Index(fields=['assignment', 'user']),
            models.Index(fields=['status']),
            models.Index(fields=['graded_by']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.assignment.title}"


class SubmissionFile(models.Model):
    """File attached to a submission."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name='uploaded_files'
    )

    file = models.FileField(_('file'), upload_to='submissions/')
    filename = models.CharField(_('filename'), max_length=255)
    file_size = models.BigIntegerField(_('file size'), help_text=_('Size in bytes'))
    file_type = models.CharField(_('file type'), max_length=100, blank=True)

    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)

    class Meta:
        verbose_name = _('submission file')
        verbose_name_plural = _('submission files')
        ordering = ['uploaded_at']

    def __str__(self):
        return f"{self.filename} - {self.submission.user.email}"


class SubmissionComment(models.Model):
    """Comments on submissions (from teachers or students)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submission_comments'
    )

    comment = models.TextField(_('comment'))

    # Attachments
    attachments = models.JSONField(_('attachments'), default=list, blank=True)

    is_draft = models.BooleanField(_('draft'), default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('submission comment')
        verbose_name_plural = _('submission comments')
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.email} on {self.submission}"
