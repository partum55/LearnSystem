import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Assignment(models.Model):
    """Assignment/homework model with support for multiple types."""

    ASSIGNMENT_TYPES = [
        ('QUIZ', 'Quiz/Test'),
        ('FILE_UPLOAD', 'File Upload'),
        ('TEXT', 'Text Submission'),
        ('CODE', 'Code Submission'),
        ('URL', 'URL/Link Submission'),
        ('MANUAL_GRADE', 'Manual Grade Only'),
        ('EXTERNAL', 'External Tool'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='assignments')

    # Link to module - assignments are now part of modules
    module = models.ForeignKey(
        'courses.Module',
        on_delete=models.CASCADE,
        related_name='assignments',
        null=True,
        blank=True,
        help_text=_('Module this assignment belongs to')
    )

    # Position within module
    position = models.PositiveIntegerField(_('position'), default=0)

    # Gradebook category
    category = models.ForeignKey(
        'gradebook.GradebookCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignments',
        help_text=_('Gradebook category for weighting')
    )

    # Assignment type
    assignment_type = models.CharField(
        _('assignment type'),
        max_length=20,
        choices=ASSIGNMENT_TYPES,
        default='FILE_UPLOAD'
    )

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'))

    # Rich content support for description and instructions
    description_format = models.CharField(
        _('description format'),
        max_length=20,
        choices=[
            ('PLAIN', 'Plain Text'),
            ('MARKDOWN', 'Markdown'),
            ('HTML', 'HTML'),
            ('RICH', 'Rich Text (with LaTeX & Code)'),
        ],
        default='MARKDOWN',
        help_text=_('Format type for description')
    )

    instructions = models.TextField(_('instructions'), blank=True)

    # Rich content support with LaTeX and code blocks
    instructions_format = models.CharField(
        _('instructions format'),
        max_length=20,
        choices=[
            ('PLAIN', 'Plain Text'),
            ('MARKDOWN', 'Markdown'),
            ('HTML', 'HTML'),
            ('RICH', 'Rich Text (with LaTeX & Code)'),
        ],
        default='MARKDOWN',
        help_text=_('Format type for instructions')
    )

    # Additional resources (attachments, reference materials)
    resources = models.JSONField(
        _('resources'),
        default=list,
        blank=True,
        help_text=_('Reference materials, sample files, etc.')
    )

    # Starter code for code assignments
    starter_code = models.TextField(
        _('starter code'),
        blank=True,
        help_text=_('Initial code template for students')
    )

    # Solution code (visible only to instructors)
    solution_code = models.TextField(
        _('solution code'),
        blank=True,
        help_text=_('Reference solution (instructor only)')
    )

    max_points = models.DecimalField(_('max points'), max_digits=6, decimal_places=2, default=100.00)

    due_date = models.DateTimeField(_('due date'), null=True, blank=True)
    available_from = models.DateTimeField(_('available from'), null=True, blank=True)
    available_until = models.DateTimeField(_('available until'), null=True, blank=True)

    # Rubric for grading
    rubric = models.JSONField(_('rubric'), default=dict, blank=True, help_text=_('Grading criteria'))

    allow_late_submission = models.BooleanField(_('allow late submission'), default=False)
    late_penalty_percent = models.DecimalField(
        _('late penalty percent'),
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_('Penalty percentage per day late')
    )

    # Submission settings
    submission_types = models.JSONField(
        _('submission types'),
        default=list,
        help_text=_('Allowed submission types: file, text, url')
    )

    # File upload settings
    allowed_file_types = models.JSONField(
        _('allowed file types'),
        default=list,
        blank=True,
        help_text=_('List of allowed file extensions, e.g., [".pdf", ".docx"]')
    )
    max_file_size = models.IntegerField(
        _('max file size'),
        default=10485760,  # 10 MB
        help_text=_('Maximum file size in bytes')
    )
    max_files = models.IntegerField(
        _('max files'),
        default=5,
        help_text=_('Maximum number of files allowed')
    )

    # Code submission settings
    programming_language = models.CharField(
        _('programming language'),
        max_length=50,
        blank=True,
        help_text=_('For code submissions: python, java, cpp, etc.')
    )
    auto_grading_enabled = models.BooleanField(
        _('auto grading enabled'),
        default=False,
        help_text=_('Enable automatic grading for code submissions')
    )
    test_cases = models.JSONField(
        _('test cases'),
        default=list,
        blank=True,
        help_text=_('Test cases for auto-grading code')
    )

    # Quiz settings (if type is QUIZ)
    quiz = models.ForeignKey(
        'Quiz',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignment'
    )

    # External tool settings
    external_tool_url = models.URLField(_('external tool URL'), blank=True, null=True)
    external_tool_config = models.JSONField(
        _('external tool config'),
        default=dict,
        blank=True
    )

    # Grading settings
    grade_anonymously = models.BooleanField(_('grade anonymously'), default=False)
    peer_review_enabled = models.BooleanField(_('peer review enabled'), default=False)
    peer_reviews_required = models.IntegerField(_('peer reviews required'), default=0)

    # Tags for categorization and filtering
    tags = models.JSONField(
        _('tags'),
        default=list,
        blank=True,
        help_text=_('Tags for categorization (e.g., ["homework", "lab", "project"])')
    )

    # Prerequisites - assignments that must be completed first
    prerequisites = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='unlocks',
        help_text=_('Assignments that must be completed before this one')
    )

    # Completion tracking
    estimated_duration = models.IntegerField(
        _('estimated duration'),
        null=True,
        blank=True,
        help_text=_('Estimated time to complete in minutes')
    )

    # Template and archiving
    is_template = models.BooleanField(
        _('is template'),
        default=False,
        help_text=_('Mark as template for reuse')
    )
    is_archived = models.BooleanField(
        _('is archived'),
        default=False,
        help_text=_('Archived assignments are hidden from students')
    )
    original_assignment = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='copies',
        help_text=_('Original assignment if this is a copy')
    )

    is_published = models.BooleanField(_('published'), default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_assignments'
    )

    class Meta:
        verbose_name = _('assignment')
        verbose_name_plural = _('assignments')
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['course', 'due_date']),
            models.Index(fields=['is_published']),
            models.Index(fields=['assignment_type']),
        ]

    def __str__(self):
        return f"{self.course.code} - {self.title}"

    def requires_submission(self):
        """Check if this assignment type requires a submission."""
        return self.assignment_type not in ['MANUAL_GRADE', 'QUIZ']

    def check_prerequisites_met(self, user):
        """Check if user has completed all prerequisites."""
        if not self.prerequisites.exists():
            return True

        from submissions.models import Submission
        for prerequisite in self.prerequisites.all():
            submission = Submission.objects.filter(
                assignment=prerequisite,
                user=user,
                status='GRADED'
            ).first()
            if not submission:
                return False
        return True

    def get_completion_rate(self):
        """Calculate assignment completion rate."""
        from courses.models import CourseMember
        from submissions.models import Submission

        total_students = CourseMember.objects.filter(
            course=self.course,
            role_in_course='student'
        ).count()

        if total_students == 0:
            return 0

        completed = Submission.objects.filter(
            assignment=self,
            status__in=['SUBMITTED', 'GRADED']
        ).count()

        return round((completed / total_students) * 100, 2)

    def duplicate(self, created_by, course=None):
        """Create a copy of this assignment."""
        new_assignment = Assignment.objects.create(
            course=course or self.course,
            module=self.module,
            position=self.position,
            category=self.category,
            assignment_type=self.assignment_type,
            title=f"{self.title} (Copy)",
            description=self.description,
            description_format=self.description_format,
            instructions=self.instructions,
            instructions_format=self.instructions_format,
            resources=self.resources,
            starter_code=self.starter_code,
            solution_code=self.solution_code,
            max_points=self.max_points,
            rubric=self.rubric,
            allow_late_submission=self.allow_late_submission,
            late_penalty_percent=self.late_penalty_percent,
            submission_types=self.submission_types,
            allowed_file_types=self.allowed_file_types,
            max_file_size=self.max_file_size,
            max_files=self.max_files,
            programming_language=self.programming_language,
            auto_grading_enabled=self.auto_grading_enabled,
            test_cases=self.test_cases,
            grade_anonymously=self.grade_anonymously,
            peer_review_enabled=self.peer_review_enabled,
            peer_reviews_required=self.peer_reviews_required,
            tags=self.tags,
            estimated_duration=self.estimated_duration,
            original_assignment=self,
            is_published=False,
            created_by=created_by
        )
        return new_assignment


class Quiz(models.Model):
    """Quiz/Test model."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='quizzes')

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)

    # Quiz settings
    time_limit = models.IntegerField(
        _('time limit'),
        null=True,
        blank=True,
        help_text=_('Time limit in minutes')
    )
    attempts_allowed = models.IntegerField(_('attempts allowed'), default=1)

    # Question settings
    shuffle_questions = models.BooleanField(_('shuffle questions'), default=False)
    shuffle_answers = models.BooleanField(_('shuffle answers'), default=False)

    # Display settings
    show_correct_answers = models.BooleanField(_('show correct answers'), default=True)
    show_correct_answers_at = models.DateTimeField(
        _('show correct answers at'),
        null=True,
        blank=True,
        help_text=_('When to show correct answers to students')
    )

    # Grading settings
    pass_percentage = models.DecimalField(
        _('pass percentage'),
        max_digits=5,
        decimal_places=2,
        default=60.00
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_quizzes'
    )

    class Meta:
        verbose_name = _('quiz')
        verbose_name_plural = _('quizzes')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.course.code} - {self.title}"


class QuestionBank(models.Model):
    """Question bank for storing reusable questions."""

    QUESTION_TYPES = [
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('TRUE_FALSE', 'True/False'),
        ('FILL_BLANK', 'Fill in the Blank'),
        ('MATCHING', 'Matching'),
        ('NUMERICAL', 'Numerical'),
        ('FORMULA', 'Formula'),
        ('SHORT_ANSWER', 'Short Answer'),
        ('ESSAY', 'Essay'),
        ('CODE', 'Code Question'),
        # New question types
        ('FILE_UPLOAD', 'File Upload Question'),
        ('ORDERING', 'Ordering Question'),
        ('HOTSPOT', 'Hotspot (Image Selection)'),
        ('DRAG_DROP', 'Drag and Drop'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='question_bank')

    question_type = models.CharField(_('question type'), max_length=30, choices=QUESTION_TYPES)

    stem = models.TextField(_('question stem'), help_text=_('The main question text'))

    # Options for multiple choice, matching, etc.
    options = models.JSONField(_('options'), default=dict, blank=True)

    # Correct answer(s)
    correct_answer = models.JSONField(_('correct answer'), default=dict, blank=True)

    # Explanation/feedback
    explanation = models.TextField(_('explanation'), blank=True)

    # Points for this question
    points = models.DecimalField(_('points'), max_digits=6, decimal_places=2, default=1.00)

    # Metadata: difficulty, tags, etc.
    metadata = models.JSONField(_('metadata'), default=dict, blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_questions'
    )

    class Meta:
        verbose_name = _('question')
        verbose_name_plural = _('questions')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.question_type} - {self.stem[:50]}"


class QuizQuestion(models.Model):
    """Association between Quiz and Questions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name='quiz_associations')

    position = models.PositiveIntegerField(_('position'), default=0)
    points_override = models.DecimalField(
        _('points override'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Override the default points for this question in this quiz')
    )

    class Meta:
        verbose_name = _('quiz question')
        verbose_name_plural = _('quiz questions')
        ordering = ['quiz', 'position']
        unique_together = [['quiz', 'question']]

    def __str__(self):
        return f"{self.quiz.title} - Q{self.position}"


class QuizAttempt(models.Model):
    """Student attempt at a quiz."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts'
    )

    attempt_number = models.IntegerField(_('attempt number'), default=1)

    started_at = models.DateTimeField(_('started at'), auto_now_add=True)
    submitted_at = models.DateTimeField(_('submitted at'), null=True, blank=True)

    # Answers stored as JSON
    answers = models.JSONField(_('answers'), default=dict, blank=True)

    # Scoring
    auto_score = models.DecimalField(
        _('auto score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    manual_score = models.DecimalField(
        _('manual score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    final_score = models.DecimalField(
        _('final score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )

    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='graded_quiz_attempts'
    )
    graded_at = models.DateTimeField(_('graded at'), null=True, blank=True)

    feedback = models.TextField(_('feedback'), blank=True)

    # Security and proctoring
    ip_address = models.GenericIPAddressField(_('IP address'), null=True, blank=True)
    browser_fingerprint = models.CharField(_('browser fingerprint'), max_length=255, blank=True)
    proctoring_data = models.JSONField(_('proctoring data'), default=dict, blank=True)

    class Meta:
        verbose_name = _('quiz attempt')
        verbose_name_plural = _('quiz attempts')
        ordering = ['-started_at']
        unique_together = [['quiz', 'user', 'attempt_number']]

    def __str__(self):
        return f"{self.user.email} - {self.quiz.title} (Attempt {self.attempt_number})"
