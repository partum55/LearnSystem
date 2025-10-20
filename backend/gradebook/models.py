import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.db.models import Sum, Avg, F
from decimal import Decimal


class GradebookEntry(models.Model):
    """
    Individual gradebook entry for a student in a course.
    Stores aggregated grade information for each assignment/quiz.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='gradebook_entries'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gradebook_entries',
        limit_choices_to={'role': 'STUDENT'}
    )
    assignment = models.ForeignKey(
        'assessments.Assignment',
        on_delete=models.CASCADE,
        related_name='gradebook_entries',
        null=True,
        blank=True
    )
    
    # Grade information
    score = models.DecimalField(
        _('score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Points earned')
    )
    max_score = models.DecimalField(
        _('max score'),
        max_digits=6,
        decimal_places=2,
        help_text=_('Maximum possible points')
    )
    percentage = models.DecimalField(
        _('percentage'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Score as percentage')
    )
    
    # Status
    STATUS_CHOICES = [
        ('NOT_SUBMITTED', 'Not Submitted'),
        ('SUBMITTED', 'Submitted'),
        ('GRADED', 'Graded'),
        ('EXCUSED', 'Excused'),
        ('MISSING', 'Missing'),
        ('LATE', 'Late'),
    ]
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='NOT_SUBMITTED'
    )
    
    # Additional info
    is_late = models.BooleanField(_('late submission'), default=False)
    is_excused = models.BooleanField(_('excused'), default=False)
    notes = models.TextField(_('notes'), blank=True)
    
    # Submission reference
    submission = models.OneToOneField(
        'submissions.Submission',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gradebook_entry'
    )
    
    # Override options
    override_score = models.DecimalField(
        _('override score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Manual override of calculated score')
    )
    override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='grade_overrides'
    )
    override_at = models.DateTimeField(_('override at'), null=True, blank=True)
    override_reason = models.TextField(_('override reason'), blank=True)
    
    # Timestamps
    graded_at = models.DateTimeField(_('graded at'), null=True, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('gradebook entry')
        verbose_name_plural = _('gradebook entries')
        unique_together = [['course', 'student', 'assignment']]
        ordering = ['course', 'student']
        indexes = [
            models.Index(fields=['course', 'student']),
            models.Index(fields=['status']),
            models.Index(fields=['graded_at']),
        ]
    
    def __str__(self):
        return f"{self.student.email} - {self.assignment.title if self.assignment else 'Overall'}"
    
    def calculate_percentage(self):
        """Calculate percentage score."""
        if self.max_score and self.max_score > 0:
            score = self.override_score if self.override_score is not None else self.score
            if score is not None:
                self.percentage = (score / self.max_score) * 100
        return self.percentage
    
    def get_final_score(self):
        """Get final score (override or regular)."""
        return self.override_score if self.override_score is not None else self.score
    
    def save(self, *args, **kwargs):
        """Auto-calculate percentage on save."""
        self.calculate_percentage()
        super().save(*args, **kwargs)


class GradebookCategory(models.Model):
    """
    Category for grouping assignments (e.g., Homework, Exams, Projects).
    Used for weighted grading calculations.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='gradebook_categories'
    )
    
    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    
    # Weighting
    weight = models.DecimalField(
        _('weight'),
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_('Weight percentage (e.g., 30 for 30%)')
    )
    
    # Drop lowest scores
    drop_lowest = models.IntegerField(
        _('drop lowest'),
        default=0,
        help_text=_('Number of lowest scores to drop')
    )
    
    position = models.PositiveIntegerField(_('position'), default=0)
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('gradebook category')
        verbose_name_plural = _('gradebook categories')
        ordering = ['course', 'position']
        unique_together = [['course', 'name']]
    
    def __str__(self):
        return f"{self.course.code} - {self.name} ({self.weight}%)"


class CourseGradeSummary(models.Model):
    """
    Aggregated grade summary for a student in a course.
    Calculated from all gradebook entries and category weights.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='grade_summaries'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_grade_summaries'
    )
    
    # Overall grade
    total_points_earned = models.DecimalField(
        _('total points earned'),
        max_digits=8,
        decimal_places=2,
        default=0
    )
    total_points_possible = models.DecimalField(
        _('total points possible'),
        max_digits=8,
        decimal_places=2,
        default=0
    )
    current_grade = models.DecimalField(
        _('current grade'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Current percentage grade')
    )
    
    # Letter grade
    letter_grade = models.CharField(
        _('letter grade'),
        max_length=5,
        blank=True,
        help_text=_('A, B, C, D, F, etc.')
    )
    
    # Breakdown by category
    category_grades = models.JSONField(
        _('category grades'),
        default=dict,
        blank=True,
        help_text=_('Grades broken down by category')
    )
    
    # Statistics
    assignments_completed = models.IntegerField(_('assignments completed'), default=0)
    assignments_total = models.IntegerField(_('assignments total'), default=0)
    
    # Final grade (after course ends)
    final_grade = models.DecimalField(
        _('final grade'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    is_final = models.BooleanField(_('is final'), default=False)
    
    # Timestamps
    last_calculated = models.DateTimeField(_('last calculated'), auto_now=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('course grade summary')
        verbose_name_plural = _('course grade summaries')
        unique_together = [['course', 'student']]
        ordering = ['course', 'student']
        indexes = [
            models.Index(fields=['course', 'student']),
            models.Index(fields=['current_grade']),
        ]
    
    def __str__(self):
        return f"{self.student.email} - {self.course.code}: {self.current_grade}%"
    
    def calculate_current_grade(self):
        """Calculate current grade from all entries."""
        entries = GradebookEntry.objects.filter(
            course=self.course,
            student=self.student,
            status='GRADED'
        )
        
        total_earned = Decimal('0')
        total_possible = Decimal('0')
        completed = 0
        
        for entry in entries:
            score = entry.get_final_score()
            if score is not None:
                total_earned += score
                total_possible += entry.max_score
                completed += 1
        
        self.total_points_earned = total_earned
        self.total_points_possible = total_possible
        self.assignments_completed = completed
        
        if total_possible > 0:
            self.current_grade = (total_earned / total_possible) * 100
        else:
            self.current_grade = None
        
        self.calculate_letter_grade()
        return self.current_grade
    
    def calculate_letter_grade(self):
        """Convert percentage to letter grade."""
        if self.current_grade is None:
            self.letter_grade = ''
            return
        
        grade = float(self.current_grade)
        if grade >= 90:
            self.letter_grade = 'A'
        elif grade >= 80:
            self.letter_grade = 'B'
        elif grade >= 70:
            self.letter_grade = 'C'
        elif grade >= 60:
            self.letter_grade = 'D'
        else:
            self.letter_grade = 'F'
        
        return self.letter_grade


class GradeHistory(models.Model):
    """
    Track history of grade changes for audit purposes.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gradebook_entry = models.ForeignKey(
        GradebookEntry,
        on_delete=models.CASCADE,
        related_name='history'
    )
    
    old_score = models.DecimalField(
        _('old score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    new_score = models.DecimalField(
        _('new score'),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='grade_changes'
    )
    change_reason = models.TextField(_('change reason'), blank=True)
    
    changed_at = models.DateTimeField(_('changed at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('grade history')
        verbose_name_plural = _('grade histories')
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.gradebook_entry} - {self.old_score} → {self.new_score}"
