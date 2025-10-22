"""
Bulk operations for courses, grading, and messaging
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.core.mail import send_mass_mail
from django.utils import timezone
from datetime import timedelta
import csv
import io


class BulkOperationsMixin:
    """Mixin for bulk operations on viewsets"""
    
    @action(detail=False, methods=['post'], url_path='bulk-grade')
    def bulk_grade(self, request):
        """
        Apply same grade to multiple submissions
        
        Payload:
        {
            "submission_ids": ["uuid1", "uuid2"],
            "grade": 85.5,
            "feedback": "Good work!"
        }
        """
        from submissions.models import Submission
        
        submission_ids = request.data.get('submission_ids', [])
        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')
        
        if not submission_ids or grade is None:
            return Response(
                {'error': 'submission_ids and grade are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                submissions = Submission.objects.filter(id__in=submission_ids)
                updated_count = submissions.update(
                    grade=grade,
                    feedback=feedback,
                    graded_at=timezone.now(),
                    graded_by=request.user
                )
                
                return Response({
                    'success': True,
                    'updated_count': updated_count,
                    'message': f'Successfully graded {updated_count} submissions'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='import-grades')
    def import_grades(self, request):
        """
        Import grades from CSV file
        
        CSV format:
        student_email,assignment_id,grade,feedback
        """
        from submissions.models import Submission
        from users.models import User
        
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response(
                {'error': 'CSV file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            decoded_file = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))
            
            success_count = 0
            errors = []
            
            with transaction.atomic():
                for row_num, row in enumerate(csv_reader, start=2):
                    try:
                        user = User.objects.get(email=row['student_email'])
                        submission = Submission.objects.get(
                            user=user,
                            assignment_id=row['assignment_id']
                        )
                        
                        submission.grade = float(row['grade'])
                        submission.feedback = row.get('feedback', '')
                        submission.graded_at = timezone.now()
                        submission.graded_by = request.user
                        submission.save()
                        
                        success_count += 1
                    except User.DoesNotExist:
                        errors.append(f"Row {row_num}: User not found - {row['student_email']}")
                    except Submission.DoesNotExist:
                        errors.append(f"Row {row_num}: Submission not found")
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
            
            return Response({
                'success': True,
                'imported_count': success_count,
                'errors': errors
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='bulk-message')
    def bulk_message(self, request, pk=None):
        """
        Send message to multiple users in a course
        
        Payload:
        {
            "recipient_filter": "all" | "students" | "grade_below",
            "grade_threshold": 70,  // if recipient_filter is "grade_below"
            "subject": "Important Announcement",
            "message": "Message content",
            "send_email": true,
            "send_notification": true
        }
        """
        from courses.models import Course, CourseMember
        from notifications.models import Notification
        from users.models import User
        
        course = self.get_object()
        
        recipient_filter = request.data.get('recipient_filter', 'all')
        subject = request.data.get('subject')
        message = request.data.get('message')
        send_email = request.data.get('send_email', True)
        send_notification = request.data.get('send_notification', True)
        
        if not subject or not message:
            return Response(
                {'error': 'subject and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get recipients based on filter
        members = CourseMember.objects.filter(course=course, role='student')
        
        if recipient_filter == 'grade_below':
            grade_threshold = request.data.get('grade_threshold', 70)
            # Filter students with average grade below threshold
            # This is a simplified version - you'd need to calculate actual grades
            members = members.filter(final_grade__lt=grade_threshold)
        
        recipients = [member.user for member in members]
        
        # Send notifications
        if send_notification:
            notifications = [
                Notification(
                    user=user,
                    title=subject,
                    message=message,
                    type='announcement',
                    related_object_type='course',
                    related_object_id=course.id
                )
                for user in recipients
            ]
            Notification.objects.bulk_create(notifications)
        
        # Send emails
        if send_email:
            email_messages = [
                (
                    subject,
                    message,
                    'noreply@lms.com',
                    [user.email]
                )
                for user in recipients
            ]
            send_mass_mail(email_messages, fail_silently=False)
        
        return Response({
            'success': True,
            'recipient_count': len(recipients),
            'message': f'Message sent to {len(recipients)} recipients'
        })
    
    @action(detail=True, methods=['post'], url_path='clone')
    def clone_course(self, request, pk=None):
        """
        Clone course structure for new semester
        
        Payload:
        {
            "new_title": "Course Title Fall 2025",
            "include_assignments": true,
            "include_quizzes": true,
            "include_modules": true,
            "date_shift_days": 180  // Shift all dates by N days
        }
        """
        from courses.models import Course, Module
        from assessments.models import Assignment, Quiz
        
        source_course = self.get_object()
        
        new_title = request.data.get('new_title', f"{source_course.title} (Copy)")
        include_assignments = request.data.get('include_assignments', True)
        include_quizzes = request.data.get('include_quizzes', True)
        include_modules = request.data.get('include_modules', True)
        date_shift_days = request.data.get('date_shift_days', 0)
        
        try:
            with transaction.atomic():
                # Clone course
                new_course = Course.objects.create(
                    title=new_title,
                    description=source_course.description,
                    owner=request.user,
                    status='draft',
                    academic_year=request.data.get('academic_year'),
                    start_date=source_course.start_date + timedelta(days=date_shift_days) if source_course.start_date else None,
                    end_date=source_course.end_date + timedelta(days=date_shift_days) if source_course.end_date else None
                )
                
                # Clone modules
                if include_modules:
                    modules = Module.objects.filter(course=source_course)
                    for module in modules:
                        Module.objects.create(
                            course=new_course,
                            title=module.title,
                            description=module.description,
                            order=module.order
                        )
                
                # Clone assignments
                if include_assignments:
                    assignments = Assignment.objects.filter(course=source_course)
                    for assignment in assignments:
                        new_deadline = assignment.deadline + timedelta(days=date_shift_days) if assignment.deadline else None
                        Assignment.objects.create(
                            course=new_course,
                            title=assignment.title,
                            description=assignment.description,
                            deadline=new_deadline,
                            max_points=assignment.max_points
                        )
                
                # Clone quizzes
                if include_quizzes:
                    quizzes = Quiz.objects.filter(course=source_course)
                    for quiz in quizzes:
                        new_start = quiz.start_time + timedelta(days=date_shift_days) if quiz.start_time else None
                        new_end = quiz.end_time + timedelta(days=date_shift_days) if quiz.end_time else None
                        new_quiz = Quiz.objects.create(
                            course=new_course,
                            title=quiz.title,
                            description=quiz.description,
                            start_time=new_start,
                            end_time=new_end,
                            duration_minutes=quiz.duration_minutes,
                            max_attempts=quiz.max_attempts
                        )
                        
                        # Clone questions
                        for question in quiz.questions.all():
                            new_quiz.questions.create(
                                text=question.text,
                                question_type=question.question_type,
                                points=question.points,
                                metadata=question.metadata
                            )
                
                return Response({
                    'success': True,
                    'new_course_id': str(new_course.id),
                    'message': f'Course cloned successfully as "{new_title}"'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

