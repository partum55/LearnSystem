import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Assignment(models.Model):
    """Assignment/homework model."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='assignments')

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'))

    instructions = models.TextField(_('instructions'), blank=True)

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

    submission_types = models.JSONField(
        _('submission types'),
        default=list,
        help_text=_('Allowed submission types: file, text, url')
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
        ]

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

    # For categorization
    tags = models.JSONField(_('tags'), default=list, blank=True)

    is_active = models.BooleanField(_('active'), default=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_questions'
    )

    class Meta:
        verbose_name = _('question')
        verbose_name_plural = _('question bank')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['course', 'question_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.question_type}: {self.stem[:50]}..."


class Quiz(models.Model):
    """Quiz/test model."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='quizzes')

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)

    instructions = models.TextField(_('instructions'), blank=True)

    # Questions can be from question bank or specific to this quiz
    questions = models.ManyToManyField(
        QuestionBank,
        through='QuizQuestion',
        related_name='quizzes'
    )

    # Configuration
    time_limit_minutes = models.IntegerField(_('time limit (minutes)'), null=True, blank=True)
    max_attempts = models.IntegerField(_('max attempts'), default=1)

    shuffle_questions = models.BooleanField(_('shuffle questions'), default=False)
    shuffle_answers = models.BooleanField(_('shuffle answers'), default=False)

    show_correct_answers = models.BooleanField(_('show correct answers'), default=True)
    show_correct_answers_date = models.DateTimeField(_('show correct answers date'), null=True, blank=True)

    # Availability
    available_from = models.DateTimeField(_('available from'), null=True, blank=True)
    available_until = models.DateTimeField(_('available until'), null=True, blank=True)

    is_published = models.BooleanField(_('published'), default=False)

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
        indexes = [
            models.Index(fields=['course', 'is_published']),
        ]

    def __str__(self):
        return f"{self.course.code} - {self.title}"


class QuizQuestion(models.Model):
    """Through model for Quiz-Question relationship."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE)

    position = models.PositiveIntegerField(_('position'), default=0)
    points_override = models.DecimalField(
        _('points override'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Override default question points')
    )

    class Meta:
        ordering = ['quiz', 'position']
        unique_together = [['quiz', 'question']]

    def __str__(self):
        return f"{self.quiz.title} - Question {self.position}"


class QuizAttempt(models.Model):
    """Student's quiz attempt."""

    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('GRADED', 'Graded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')

    attempt_number = models.PositiveIntegerField(_('attempt number'))

    status = models.CharField(_('status'), max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')

    started_at = models.DateTimeField(_('started at'), auto_now_add=True)
    submitted_at = models.DateTimeField(_('submitted at'), null=True, blank=True)

    # Answers stored as JSON: {question_id: answer_data}
    answers = models.JSONField(_('answers'), default=dict, blank=True)

    # Scoring
    auto_score = models.DecimalField(_('auto score'), max_digits=6, decimal_places=2, null=True, blank=True)
    manual_score = models.DecimalField(_('manual score'), max_digits=6, decimal_places=2, null=True, blank=True)
    final_score = models.DecimalField(_('final score'), max_digits=6, decimal_places=2, null=True, blank=True)

    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='graded_attempts'
    )
    graded_at = models.DateTimeField(_('graded at'), null=True, blank=True)

    feedback = models.TextField(_('feedback'), blank=True)

    class Meta:
        verbose_name = _('quiz attempt')
        verbose_name_plural = _('quiz attempts')
        ordering = ['-started_at']
        unique_together = [['quiz', 'user', 'attempt_number']]
        indexes = [
            models.Index(fields=['quiz', 'user']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.quiz.title} (Attempt {self.attempt_number})"


class Gradebook(models.Model):
    """Aggregated grades for a student in a course."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='gradebook_entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='grades')

    # Aggregated score (computed from assignments and quizzes)
    aggregated_score = models.DecimalField(_('aggregated score'), max_digits=6, decimal_places=2, null=True, blank=True)

    # Detailed breakdown stored as JSON
    breakdown = models.JSONField(_('breakdown'), default=dict, blank=True)

    # Letter grade
    letter_grade = models.CharField(_('letter grade'), max_length=5, blank=True)

    last_calculated = models.DateTimeField(_('last calculated'), auto_now=True)

    class Meta:
        verbose_name = _('gradebook entry')
        verbose_name_plural = _('gradebook')
        unique_together = [['course', 'user']]
        indexes = [
            models.Index(fields=['course', 'user']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.code}: {self.aggregated_score}"
