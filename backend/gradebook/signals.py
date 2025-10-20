from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from assessments.models import Assignment
from submissions.models import Submission
from .models import GradebookEntry, CourseGradeSummary, GradeHistory


@receiver(post_save, sender=Assignment)
def create_gradebook_entries_for_assignment(sender, instance, created, **kwargs):
    """
    Automatically create gradebook entries for all students when assignment is created.
    """
    if created and instance.is_published:
        from courses.models import CourseMember
        
        # Get all students in the course
        students = CourseMember.objects.filter(
            course=instance.course,
            role_in_course='STUDENT'
        ).select_related('user')
        
        # Create gradebook entry for each student
        entries = []
        for member in students:
            entry = GradebookEntry(
                course=instance.course,
                student=member.user,
                assignment=instance,
                max_score=instance.max_points,
                status='NOT_SUBMITTED'
            )
            entries.append(entry)
        
        if entries:
            GradebookEntry.objects.bulk_create(entries, ignore_conflicts=True)


@receiver(post_save, sender=Submission)
def update_gradebook_from_submission(sender, instance, created, **kwargs):
    """
    Update gradebook entry when submission is graded.
    """
    # Get or create gradebook entry
    entry, created = GradebookEntry.objects.get_or_create(
        course=instance.assignment.course,
        student=instance.user,
        assignment=instance.assignment,
        defaults={
            'max_score': instance.assignment.max_points,
            'submission': instance,
        }
    )
    
    # Update status based on submission
    if instance.status == 'SUBMITTED':
        entry.status = 'SUBMITTED'
        entry.is_late = instance.is_late
    elif instance.status == 'GRADED':
        entry.status = 'GRADED'
        entry.score = instance.grade
        entry.graded_at = instance.graded_at
        entry.is_late = instance.is_late
    
    # Link submission if not already linked
    if not entry.submission:
        entry.submission = instance
    
    entry.save()
    
    # Update course grade summary
    update_course_grade_summary(instance.assignment.course, instance.user)


@receiver(pre_save, sender=GradebookEntry)
def track_grade_changes(sender, instance, **kwargs):
    """
    Track grade changes for audit purposes.
    """
    if instance.pk:
        try:
            old_entry = GradebookEntry.objects.get(pk=instance.pk)
            old_score = old_entry.get_final_score()
            new_score = instance.get_final_score()
            
            # If score changed, create history entry
            if old_score != new_score:
                GradeHistory.objects.create(
                    gradebook_entry=instance,
                    old_score=old_score,
                    new_score=new_score,
                    changed_by=instance.override_by if instance.override_by else None,
                    change_reason=instance.override_reason if instance.override_reason else 'Grade updated'
                )
        except GradebookEntry.DoesNotExist:
            pass


def update_course_grade_summary(course, student):
    """
    Helper function to update or create course grade summary.
    """
    summary, created = CourseGradeSummary.objects.get_or_create(
        course=course,
        student=student
    )
    
    # Count total assignments
    from assessments.models import Assignment
    total_assignments = Assignment.objects.filter(
        course=course,
        is_published=True
    ).count()
    
    summary.assignments_total = total_assignments
    summary.calculate_current_grade()
    summary.save()

