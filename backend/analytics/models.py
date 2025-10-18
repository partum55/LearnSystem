from django.db import models
import uuid
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class CourseAnalytics(models.Model):
    """Analytics data for courses."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='analytics')

    total_students = models.IntegerField(_('total students'), default=0)
    active_students = models.IntegerField(_('active students'), default=0)

    average_grade = models.DecimalField(_('average grade'), max_digits=5, decimal_places=2, null=True, blank=True)

    completion_rate = models.DecimalField(_('completion rate'), max_digits=5, decimal_places=2, null=True, blank=True)

    # Engagement metrics
    total_submissions = models.IntegerField(_('total submissions'), default=0)
    total_quiz_attempts = models.IntegerField(_('total quiz attempts'), default=0)

    calculated_at = models.DateTimeField(_('calculated at'), auto_now=True)

    class Meta:
        verbose_name = _('course analytics')
        verbose_name_plural = _('course analytics')

    def __str__(self):
        return f"Analytics for {self.course.code}"


class StudentActivity(models.Model):
    """Track student activity in courses."""

    ACTIVITY_TYPES = [
        ('LOGIN', 'Login'),
        ('VIEW_COURSE', 'View Course'),
        ('VIEW_MODULE', 'View Module'),
        ('VIEW_RESOURCE', 'View Resource'),
        ('SUBMIT_ASSIGNMENT', 'Submit Assignment'),
        ('START_QUIZ', 'Start Quiz'),
        ('SUBMIT_QUIZ', 'Submit Quiz'),
        ('VIEW_GRADE', 'View Grade'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activities')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='student_activities', null=True, blank=True)

    activity_type = models.CharField(_('activity type'), max_length=50, choices=ACTIVITY_TYPES)

    # Reference to related object (optional)
    object_type = models.CharField(_('object type'), max_length=50, blank=True)
    object_id = models.CharField(_('object ID'), max_length=100, blank=True)

    # Additional metadata
    metadata = models.JSONField(_('metadata'), default=dict, blank=True)

    ip_address = models.GenericIPAddressField(_('IP address'), null=True, blank=True)
    user_agent = models.TextField(_('user agent'), blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('student activity')
        verbose_name_plural = _('student activities')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'course']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.activity_type}"


class QuestionStatistics(models.Model):
    """Statistics for quiz questions (item analysis)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey('assessments.QuestionBank', on_delete=models.CASCADE, related_name='statistics')

    times_answered = models.IntegerField(_('times answered'), default=0)
    times_correct = models.IntegerField(_('times correct'), default=0)
    times_incorrect = models.IntegerField(_('times incorrect'), default=0)

    # Percentage
    correct_rate = models.DecimalField(_('correct rate'), max_digits=5, decimal_places=2, null=True, blank=True)

    # Item difficulty (0-1, where 1 is easiest)
    difficulty_index = models.DecimalField(_('difficulty index'), max_digits=5, decimal_places=4, null=True, blank=True)

    # Item discrimination (correlation with overall score)
    discrimination_index = models.DecimalField(_('discrimination index'), max_digits=5, decimal_places=4, null=True, blank=True)

    # Average time to answer (seconds)
    average_time_seconds = models.IntegerField(_('average time (seconds)'), null=True, blank=True)

    last_calculated = models.DateTimeField(_('last calculated'), auto_now=True)

    class Meta:
        verbose_name = _('question statistics')
        verbose_name_plural = _('question statistics')

    def __str__(self):
        return f"Stats for question {self.question.id}"
