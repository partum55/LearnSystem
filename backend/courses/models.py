from django.db import models
import uuid
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Course(models.Model):
    """Course model with multilingual support."""

    VISIBILITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('PRIVATE', 'Private'),
        ('DRAFT', 'Draft'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(_('course code'), max_length=50, unique=True, db_index=True)

    title_uk = models.CharField(_('title (Ukrainian)'), max_length=255)
    title_en = models.CharField(_('title (English)'), max_length=255, blank=True)

    description_uk = models.TextField(_('description (Ukrainian)'), blank=True)
    description_en = models.TextField(_('description (English)'), blank=True)

    syllabus = models.TextField(_('syllabus'), blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_courses',
        verbose_name=_('owner')
    )

    visibility = models.CharField(
        _('visibility'),
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='DRAFT'
    )

    thumbnail = models.ImageField(_('thumbnail'), upload_to='course_thumbnails/', blank=True, null=True)

    start_date = models.DateField(_('start date'), null=True, blank=True)
    end_date = models.DateField(_('end date'), null=True, blank=True)

    # Academic tracking
    academic_year = models.CharField(_('academic year'), max_length=20, blank=True)
    department_id = models.UUIDField(_('department ID'), null=True, blank=True)

    max_students = models.IntegerField(_('max students'), null=True, blank=True)

    # Course status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    status = models.CharField(_('status'), max_length=20, choices=STATUS_CHOICES, default='draft')

    is_published = models.BooleanField(_('published'), default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('course')
        verbose_name_plural = _('courses')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['owner']),
            models.Index(fields=['is_published']),
        ]

    def __str__(self):
        return f"{self.code} - {self.title_uk}"

    def get_title(self, language='uk'):
        """Get title in specified language."""
        return getattr(self, f'title_{language}', self.title_uk)

    def get_description(self, language='uk'):
        """Get description in specified language."""
        return getattr(self, f'description_{language}', self.description_uk)


class CourseMember(models.Model):
    """Course membership model linking users to courses."""

    ROLE_CHOICES = [
        ('TEACHER', 'Teacher'),
        ('TA', 'Teaching Assistant'),
        ('STUDENT', 'Student'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_memberships')

    role_in_course = models.CharField(_('role in course'), max_length=20, choices=ROLE_CHOICES)

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='added_members',
        verbose_name=_('added by')
    )

    added_at = models.DateTimeField(_('added at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Enrollment tracking
    ENROLLMENT_STATUS_CHOICES = [
        ('active', 'Active'),
        ('dropped', 'Dropped'),
        ('completed', 'Completed'),
    ]
    enrollment_status = models.CharField(
        _('enrollment status'),
        max_length=20,
        choices=ENROLLMENT_STATUS_CHOICES,
        default='active'
    )
    completion_date = models.DateTimeField(_('completion date'), null=True, blank=True)

    # Grade tracking
    final_grade = models.DecimalField(_('final grade'), max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = _('course member')
        verbose_name_plural = _('course members')
        unique_together = [['course', 'user']]
        indexes = [
            models.Index(fields=['course', 'user']),
            models.Index(fields=['role_in_course']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.code} ({self.role_in_course})"


class Module(models.Model):
    """Course module/section for organizing content."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)

    position = models.PositiveIntegerField(_('position'), default=0)

    content_meta = models.JSONField(_('content metadata'), default=dict, blank=True)

    is_published = models.BooleanField(_('published'), default=False)

    publish_date = models.DateTimeField(_('publish date'), null=True, blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('module')
        verbose_name_plural = _('modules')
        ordering = ['course', 'position']
        indexes = [
            models.Index(fields=['course', 'position']),
        ]

    def __str__(self):
        return f"{self.course.code} - {self.title}"


class Resource(models.Model):
    """Course resource (files, videos, links, etc.)."""

    RESOURCE_TYPES = [
        ('VIDEO', 'Video'),
        ('PDF', 'PDF Document'),
        ('SLIDE', 'Presentation'),
        ('LINK', 'External Link'),
        ('TEXT', 'Text Content'),
        ('CODE', 'Code File'),
        ('OTHER', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='resources')

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)

    resource_type = models.CharField(_('resource type'), max_length=20, choices=RESOURCE_TYPES)

    # For uploaded files
    file = models.FileField(_('file'), upload_to='course_resources/', blank=True, null=True)

    # For external links
    external_url = models.URLField(_('external URL'), blank=True, null=True)

    # For text content
    text_content = models.TextField(_('text content'), blank=True)

    storage_path = models.CharField(_('storage path'), max_length=500, blank=True)

    metadata = models.JSONField(_('metadata'), default=dict, blank=True)

    position = models.PositiveIntegerField(_('position'), default=0)

    is_downloadable = models.BooleanField(_('downloadable'), default=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_resources'
    )

    class Meta:
        verbose_name = _('resource')
        verbose_name_plural = _('resources')
        ordering = ['module', 'position']
        indexes = [
            models.Index(fields=['module', 'position']),
            models.Index(fields=['resource_type']),
        ]

    def __str__(self):
        return f"{self.title} ({self.resource_type})"


class Announcement(models.Model):
    """Course announcements."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='announcements')

    title = models.CharField(_('title'), max_length=255)
    content = models.TextField(_('content'))

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='announcements'
    )

    is_pinned = models.BooleanField(_('pinned'), default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('announcement')
        verbose_name_plural = _('announcements')
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.course.code} - {self.title}"
