from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q
from datetime import timedelta
from django.utils import timezone
from .models import CourseAnalytics, StudentActivity, QuestionStatistics
from .serializers import (
    CourseAnalyticsSerializer, StudentActivitySerializer, QuestionStatisticsSerializer
)


class CourseAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Course Analytics."""

    queryset = CourseAnalytics.objects.all()
    serializer_class = CourseAnalyticsSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course']

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get analytics dashboard data."""
        course_id = request.query_params.get('course')
        if not course_id:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analytics = CourseAnalytics.objects.get(course_id=course_id)
        except CourseAnalytics.DoesNotExist:
            return Response(
                {'error': 'Analytics not found for this course'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get additional data
        from courses.models import Course
        from submissions.models import Submission
        from assessments.models import QuizAttempt

        course = Course.objects.get(id=course_id)

        # Recent activity
        recent_submissions = Submission.objects.filter(
            assignment__course=course
        ).order_by('-submitted_at')[:5]

        recent_quiz_attempts = QuizAttempt.objects.filter(
            quiz__course=course
        ).order_by('-started_at')[:5]

        # Grade distribution
        from assessments.models import Gradebook
        gradebook_entries = Gradebook.objects.filter(course=course)

        grade_distribution = {
            'A': gradebook_entries.filter(letter_grade='A').count(),
            'B': gradebook_entries.filter(letter_grade='B').count(),
            'C': gradebook_entries.filter(letter_grade='C').count(),
            'D': gradebook_entries.filter(letter_grade='D').count(),
            'F': gradebook_entries.filter(letter_grade='F').count(),
        }

        serializer = self.get_serializer(analytics)

        return Response({
            'analytics': serializer.data,
            'grade_distribution': grade_distribution,
            'recent_activity_count': recent_submissions.count() + recent_quiz_attempts.count()
        })


class StudentActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Student Activity tracking."""

    queryset = StudentActivity.objects.all()
    serializer_class = StudentActivitySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'course', 'activity_type']

    def get_queryset(self):
        user = self.request.user

        # Teachers/admins see all activity for their courses
        if user.role in ['SUPERADMIN', 'TEACHER']:
            return StudentActivity.objects.all()

        # Students see only their own
        return StudentActivity.objects.filter(user=user)

    @action(detail=False, methods=['post'])
    def log_activity(self, request):
        """Log a student activity."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Add IP and user agent
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        activity = serializer.save(
            user=request.user,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return Response(self.get_serializer(activity).data, status=status.HTTP_201_CREATED)

    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=False, methods=['get'])
    def engagement_report(self, request):
        """Get student engagement report for a course."""
        course_id = request.query_params.get('course')
        if not course_id:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Activity in last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)

        activities = StudentActivity.objects.filter(
            course_id=course_id,
            created_at__gte=seven_days_ago
        )

        # Group by activity type
        activity_breakdown = activities.values('activity_type').annotate(
            count=Count('id')
        ).order_by('-count')

        # Most active students
        active_students = activities.values('user__email', 'user__display_name').annotate(
            activity_count=Count('id')
        ).order_by('-activity_count')[:10]

        return Response({
            'total_activities': activities.count(),
            'activity_breakdown': list(activity_breakdown),
            'most_active_students': list(active_students),
            'period': '7 days'
        })


class QuestionStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Question Statistics (Item Analysis)."""

    queryset = QuestionStatistics.objects.all()
    serializer_class = QuestionStatisticsSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['question']

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate statistics for a question."""
        question_id = request.data.get('question_id')
        if not question_id:
            return Response(
                {'error': 'question_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from assessments.models import QuestionBank, QuizAttempt

        try:
            question = QuestionBank.objects.get(id=question_id)
        except QuestionBank.DoesNotExist:
            return Response(
                {'error': 'Question not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all attempts that answered this question
        quiz_questions = question.quizzes.all()
        attempts = QuizAttempt.objects.filter(
            quiz__in=[qq.quiz for qq in quiz_questions],
            status='GRADED'
        )

        times_answered = 0
        times_correct = 0
        times_incorrect = 0

        for attempt in attempts:
            answer = attempt.answers.get(str(question.id))
            if answer:
                times_answered += 1

                # Check if correct
                if question.question_type in ['MULTIPLE_CHOICE', 'TRUE_FALSE']:
                    if str(answer).strip() == str(question.correct_answer.get('answer', '')).strip():
                        times_correct += 1
                    else:
                        times_incorrect += 1

        # Calculate statistics
        correct_rate = (times_correct / times_answered * 100) if times_answered > 0 else 0
        difficulty_index = times_correct / times_answered if times_answered > 0 else 0

        # Update or create statistics
        stats, created = QuestionStatistics.objects.update_or_create(
            question=question,
            defaults={
                'times_answered': times_answered,
                'times_correct': times_correct,
                'times_incorrect': times_incorrect,
                'correct_rate': round(correct_rate, 2),
                'difficulty_index': round(difficulty_index, 4)
            }
        )

        serializer = self.get_serializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def course_report(self, request):
        """Get question statistics report for entire course."""
        course_id = request.query_params.get('course')
        if not course_id:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from assessments.models import QuestionBank

        questions = QuestionBank.objects.filter(course_id=course_id)
        stats = QuestionStatistics.objects.filter(question__in=questions)

        # Questions needing review (low correct rate or discrimination)
        needs_review = stats.filter(
            Q(correct_rate__lt=50) | Q(difficulty_index__lt=0.3)
        ).order_by('correct_rate')

        serializer = self.get_serializer(stats, many=True)
        review_serializer = self.get_serializer(needs_review, many=True)

        return Response({
            'all_questions': serializer.data,
            'needs_review': review_serializer.data,
            'total_questions': questions.count(),
            'analyzed_questions': stats.count()
        })

