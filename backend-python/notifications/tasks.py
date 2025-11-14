from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings


@shared_task
def send_assignment_due_reminders():
    """Send reminders for assignments due in 24 hours."""
    from assessments.models import Assignment
    from notifications.models import Notification
    
    tomorrow = timezone.now() + timedelta(days=1)
    tomorrow_end = tomorrow + timedelta(hours=1)
    
    # Get assignments due tomorrow
    assignments = Assignment.objects.filter(
        due_date__gte=tomorrow,
        due_date__lte=tomorrow_end,
        is_published=True
    )
    
    for assignment in assignments:
        # Get students enrolled in the course
        course_members = assignment.course.members.filter(role_in_course='STUDENT')
        
        for member in course_members:
            # Check if student has submitted
            from submissions.models import Submission
            submission_exists = Submission.objects.filter(
                assignment=assignment,
                user=member.user,
                status__in=['SUBMITTED', 'GRADED']
            ).exists()
            
            if not submission_exists:
                # Create notification
                Notification.objects.create(
                    user=member.user,
                    notification_type='ASSIGNMENT_DUE_SOON',
                    title=f'Assignment due soon: {assignment.title}',
                    message=f'The assignment "{assignment.title}" is due in 24 hours.',
                    payload={
                        'assignment_id': str(assignment.id),
                        'course_id': str(assignment.course.id),
                        'due_date': assignment.due_date.isoformat()
                    },
                    link=f'/courses/{assignment.course.id}/assignments/{assignment.id}'
                )
                
                # Send email if user has email notifications enabled
                if hasattr(member.user, 'notification_preferences'):
                    prefs = member.user.notification_preferences
                    if prefs.email_assignment_due_soon:
                        send_mail(
                            subject=f'Assignment due soon: {assignment.title}',
                            message=f'The assignment "{assignment.title}" is due in 24 hours.\n\nPlease submit your work before {assignment.due_date}.',
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[member.user.email],
                            fail_silently=True
                        )


@shared_task
def send_quiz_available_notifications():
    """Notify students when new quizzes become available."""
    from assessments.models import Quiz
    from notifications.models import Notification
    
    now = timezone.now()
    one_hour_ago = now - timedelta(hours=1)
    
    # Get quizzes that became available in the last hour
    quizzes = Quiz.objects.filter(
        available_from__gte=one_hour_ago,
        available_from__lte=now,
        is_published=True
    )
    
    for quiz in quizzes:
        course_members = quiz.course.members.filter(role_in_course='STUDENT')
        
        for member in course_members:
            Notification.objects.create(
                user=member.user,
                notification_type='QUIZ_AVAILABLE',
                title=f'New quiz available: {quiz.title}',
                message=f'A new quiz "{quiz.title}" is now available.',
                payload={
                    'quiz_id': str(quiz.id),
                    'course_id': str(quiz.course.id)
                },
                link=f'/courses/{quiz.course.id}/quizzes/{quiz.id}'
            )


@shared_task
def send_grade_notifications():
    """Notify students when their submissions are graded."""
    from submissions.models import Submission
    from notifications.models import Notification
    
    # Get recently graded submissions (last 10 minutes)
    ten_minutes_ago = timezone.now() - timedelta(minutes=10)
    
    submissions = Submission.objects.filter(
        status='GRADED',
        graded_at__gte=ten_minutes_ago
    )
    
    for submission in submissions:
        # Check if notification already sent
        existing = Notification.objects.filter(
            user=submission.user,
            notification_type='ASSIGNMENT_GRADED',
            payload__submission_id=str(submission.id)
        ).exists()
        
        if not existing:
            Notification.objects.create(
                user=submission.user,
                notification_type='ASSIGNMENT_GRADED',
                title=f'Assignment graded: {submission.assignment.title}',
                message=f'Your submission for "{submission.assignment.title}" has been graded. Score: {submission.grade}/{submission.assignment.max_points}',
                payload={
                    'submission_id': str(submission.id),
                    'assignment_id': str(submission.assignment.id),
                    'course_id': str(submission.assignment.course.id),
                    'grade': float(submission.grade) if submission.grade else 0
                },
                link=f'/courses/{submission.assignment.course.id}/assignments/{submission.assignment.id}/submissions/{submission.id}'
            )
            
            # Send email
            if hasattr(submission.user, 'notification_preferences'):
                prefs = submission.user.notification_preferences
                if prefs.email_assignment_graded:
                    send_mail(
                        subject=f'Assignment graded: {submission.assignment.title}',
                        message=f'Your submission for "{submission.assignment.title}" has been graded.\n\nScore: {submission.grade}/{submission.assignment.max_points}\n\nFeedback: {submission.feedback}',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[submission.user.email],
                        fail_silently=True
                    )


@shared_task
def calculate_course_analytics():
    """Calculate analytics for all courses."""
    from analytics.models import CourseAnalytics
    from courses.models import Course
    from assessments.models import Gradebook
    from django.db.models import Avg, Count
    
    courses = Course.objects.filter(is_published=True)
    
    for course in courses:
        analytics, created = CourseAnalytics.objects.get_or_create(course=course)
        
        # Count students
        total_students = course.members.filter(role_in_course='STUDENT').count()
        
        # Active students (those with at least one submission in last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        from submissions.models import Submission
        active_students = Submission.objects.filter(
            assignment__course=course,
            created_at__gte=seven_days_ago
        ).values('user').distinct().count()
        
        # Average grade
        avg_grade = Gradebook.objects.filter(
            course=course,
            aggregated_score__isnull=False
        ).aggregate(Avg('aggregated_score'))['aggregated_score__avg']
        
        # Update analytics
        analytics.total_students = total_students
        analytics.active_students = active_students
        analytics.average_grade = avg_grade
        analytics.total_submissions = Submission.objects.filter(assignment__course=course).count()
        analytics.save()


@shared_task
def cleanup_old_notifications():
    """Delete read notifications older than 30 days."""
    from notifications.models import Notification
    
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    deleted_count = Notification.objects.filter(
        is_read=True,
        created_at__lt=thirty_days_ago
    ).delete()[0]
    
    return f'Deleted {deleted_count} old notifications'

