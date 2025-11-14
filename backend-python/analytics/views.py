"""
Analytics views for course and student insights
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count, Q, F
from django.utils import timezone
from datetime import timedelta
from courses.models import Course, CourseMember
from submissions.models import Submission
from assessments.models import QuizAttempt
from gradebook.models import GradebookEntry


class AnalyticsViewSet(viewsets.ViewSet):
    """Analytics endpoints for course insights"""

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='courses/(?P<course_id>[^/.]+)/stats')
    def course_stats(self, request, course_id=None):
        """Get overall course statistics"""
        try:
            course = Course.objects.get(id=course_id)

            # Check permissions
            if not self._has_course_access(request.user, course):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            time_range = request.query_params.get('range', 'week')
            time_delta = self._get_time_delta(time_range)
            cutoff_date = timezone.now() - time_delta

            # Total students
            total_students = CourseMember.objects.filter(
                course=course,
                role_in_course='STUDENT'
            ).count()

            # Active students (logged in or submitted something recently)
            active_students = CourseMember.objects.filter(
                course=course,
                role_in_course='STUDENT',
                user__last_login__gte=cutoff_date
            ).count()

            # Average grade
            avg_grade = GradebookEntry.objects.filter(
                course=course
            ).aggregate(Avg('percentage'))['percentage__avg'] or 0

            # Completion rate
            total_assignments = course.assignments.count()
            if total_assignments > 0:
                completed = Submission.objects.filter(
                    assignment__course=course,
                    graded_at__isnull=False
                ).count()
                completion_rate = (completed / (total_students * total_assignments)) * 100
            else:
                completion_rate = 0

            # Late submissions
            late_submissions = Submission.objects.filter(
                assignment__course=course,
                is_late=True,
                submitted_at__gte=cutoff_date
            ).count()

            # Pending grading
            pending_grading = Submission.objects.filter(
                assignment__course=course,
                graded_at__isnull=True,
                submitted_at__isnull=False
            ).count()

            return Response({
                'totalStudents': total_students,
                'activeStudents': active_students,
                'averageGrade': round(avg_grade, 2),
                'completionRate': round(completion_rate, 2),
                'lateSubmissions': late_submissions,
                'pendingGrading': pending_grading
            })

        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='courses/(?P<course_id>[^/.]+)/student-progress')
    def student_progress(self, request, course_id=None):
        """Get detailed progress for all students in course"""
        try:
            course = Course.objects.get(id=course_id)

            if not self._has_course_access(request.user, course):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            students = CourseMember.objects.filter(
                course=course,
                role_in_course='STUDENT'
            ).select_related('user')

            progress_data = []

            for member in students:
                user = member.user

                # Calculate progress
                total_assignments = course.assignments.count()
                completed_assignments = Submission.objects.filter(
                    assignment__course=course,
                    user=user,
                    graded_at__isnull=False
                ).count()

                progress = (completed_assignments / total_assignments * 100) if total_assignments > 0 else 0

                # Calculate grade
                grade_avg = GradebookEntry.objects.filter(
                    course=course,
                    student=user
                ).aggregate(Avg('percentage'))['percentage__avg'] or 0

                # Check if struggling (grade < 60% or progress < 30%)
                is_struggling = grade_avg < 60 or progress < 30

                progress_data.append({
                    'userId': str(user.id),
                    'name': user.display_name,
                    'progress': round(progress, 1),
                    'grade': round(grade_avg, 2),
                    'lastActive': user.last_login.isoformat() if user.last_login else None,
                    'isStruggling': is_struggling
                })

            # Sort by struggling first, then by grade
            progress_data.sort(key=lambda x: (not x['isStruggling'], -x['grade']))

            return Response(progress_data)

        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='courses/(?P<course_id>[^/.]+)/grade-distribution')
    def grade_distribution(self, request, course_id=None):
        """Get grade distribution for visualization"""
        try:
            course = Course.objects.get(id=course_id)

            if not self._has_course_access(request.user, course):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get all grades
            grades = GradebookEntry.objects.filter(course=course).values_list('percentage', flat=True)

            # Create distribution buckets
            distribution = {
                'A (90-100)': 0,
                'B (80-89)': 0,
                'C (70-79)': 0,
                'D (60-69)': 0,
                'F (<60)': 0
            }

            for grade in grades:
                if grade >= 90:
                    distribution['A (90-100)'] += 1
                elif grade >= 80:
                    distribution['B (80-89)'] += 1
                elif grade >= 70:
                    distribution['C (70-79)'] += 1
                elif grade >= 60:
                    distribution['D (60-69)'] += 1
                else:
                    distribution['F (<60)'] += 1

            # Convert to array format for charts
            result = [
                {'grade': k, 'count': v}
                for k, v in distribution.items()
            ]

            return Response(result)

        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='courses/(?P<course_id>[^/.]+)/engagement')
    def engagement_metrics(self, request, course_id=None):
        """Get student engagement metrics over time"""
        try:
            course = Course.objects.get(id=course_id)

            if not self._has_course_access(request.user, course):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get submissions over last 30 days
            days = 30
            result = []

            for i in range(days):
                date = timezone.now() - timedelta(days=days-i)
                submissions_count = Submission.objects.filter(
                    assignment__course=course,
                    submitted_at__date=date.date()
                ).count()

                result.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'submissions': submissions_count
                })

            return Response(result)

        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def _has_course_access(self, user, course):
        """Check if user has access to course analytics"""
        if user.role == 'SUPERADMIN':
            return True

        if course.owner == user:
            return True

        # Check if user is TA or co-teacher
        is_staff = CourseMember.objects.filter(
            course=course,
            user=user,
            role_in_course__in=['TEACHER', 'TA']
        ).exists()

        return is_staff

    def _get_time_delta(self, time_range):
        """Convert time range string to timedelta"""
        if time_range == 'week':
            return timedelta(days=7)
        elif time_range == 'month':
            return timedelta(days=30)
        elif time_range == 'semester':
            return timedelta(days=120)
        else:
            return timedelta(days=7)

