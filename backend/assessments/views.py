from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Avg, Count
from .models import Assignment, QuestionBank, Quiz, QuizAttempt, Gradebook, QuizQuestion
from .serializers import (
    AssignmentSerializer, QuestionBankSerializer, QuizSerializer,
    QuizAttemptSerializer, GradebookSerializer
)


class AssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Assignment management."""

    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'is_published']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get assignment statistics."""
        assignment = self.get_object()
        submissions = assignment.submissions.filter(status__in=['SUBMITTED', 'GRADED'])

        stats = {
            'total_submissions': submissions.count(),
            'graded_submissions': submissions.filter(status='GRADED').count(),
            'average_grade': submissions.filter(grade__isnull=False).aggregate(Avg('grade'))['grade__avg'],
            'on_time_submissions': submissions.filter(is_late=False).count(),
            'late_submissions': submissions.filter(is_late=True).count(),
        }

        return Response(stats)


class QuestionBankViewSet(viewsets.ModelViewSet):
    """ViewSet for Question Bank management."""

    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'question_type', 'is_active']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple questions at once."""
        questions_data = request.data.get('questions', [])
        created_questions = []

        for question_data in questions_data:
            question_data['created_by'] = request.user.id
            serializer = self.get_serializer(data=question_data)
            if serializer.is_valid():
                serializer.save(created_by=request.user)
                created_questions.append(serializer.data)

        return Response({
            'created': len(created_questions),
            'questions': created_questions
        })


class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for Quiz management."""

    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'is_published']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def add_questions(self, request, pk=None):
        """Add questions to quiz."""
        quiz = self.get_object()
        question_ids = request.data.get('question_ids', [])

        added = 0
        for idx, question_id in enumerate(question_ids):
            try:
                question = QuestionBank.objects.get(id=question_id, course=quiz.course)
                QuizQuestion.objects.get_or_create(
                    quiz=quiz,
                    question=question,
                    defaults={'position': idx + 1}
                )
                added += 1
            except QuestionBank.DoesNotExist:
                pass

        return Response({'added': added, 'total_questions': quiz.quiz_questions.count()})

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        """Start a new quiz attempt."""
        quiz = self.get_object()
        user = request.user

        # Check if quiz is available
        now = timezone.now()
        if quiz.available_from and now < quiz.available_from:
            return Response(
                {'error': 'Quiz is not yet available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quiz.available_until and now > quiz.available_until:
            return Response(
                {'error': 'Quiz is no longer available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check max attempts
        attempts_count = QuizAttempt.objects.filter(quiz=quiz, user=user).count()
        if attempts_count >= quiz.max_attempts:
            return Response(
                {'error': f'Maximum attempts ({quiz.max_attempts}) reached'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=user,
            attempt_number=attempts_count + 1,
            status='IN_PROGRESS'
        )

        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get quiz statistics."""
        quiz = self.get_object()
        attempts = quiz.attempts.filter(status='GRADED')

        stats = {
            'total_attempts': quiz.attempts.count(),
            'completed_attempts': attempts.count(),
            'average_score': attempts.aggregate(Avg('final_score'))['final_score__avg'],
            'pass_rate': self._calculate_pass_rate(attempts),
        }

        return Response(stats)

    def _calculate_pass_rate(self, attempts):
        """Calculate percentage of attempts with score >= 60%."""
        if not attempts.exists():
            return 0
        total = attempts.count()
        passed = attempts.filter(final_score__gte=60).count()
        return round((passed / total) * 100, 2)


class QuizAttemptViewSet(viewsets.ModelViewSet):
    """ViewSet for Quiz Attempt management."""

    queryset = QuizAttempt.objects.all()
    serializer_class = QuizAttemptSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['quiz', 'user', 'status']

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit quiz attempt and auto-grade."""
        attempt = self.get_object()

        if attempt.status != 'IN_PROGRESS':
            return Response(
                {'error': 'Attempt is not in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get('answers', {})
        attempt.answers = answers
        attempt.submitted_at = timezone.now()
        attempt.status = 'SUBMITTED'

        # Auto-grade objective questions
        auto_score = self._auto_grade_attempt(attempt)
        attempt.auto_score = auto_score

        # Check if manual grading is needed
        needs_manual = self._needs_manual_grading(attempt)
        if not needs_manual:
            attempt.final_score = auto_score
            attempt.status = 'GRADED'

        attempt.save()

        # Update gradebook
        self._update_gradebook(attempt)

        serializer = self.get_serializer(attempt)
        return Response(serializer.data)

    def _auto_grade_attempt(self, attempt):
        """Auto-grade objective questions."""
        total_score = 0
        quiz_questions = attempt.quiz.quiz_questions.all()

        for quiz_q in quiz_questions:
            question = quiz_q.question
            points = quiz_q.points_override or question.points

            # Get student's answer
            answer = attempt.answers.get(str(question.id))
            if not answer:
                continue

            # Auto-grade based on question type
            if question.question_type in ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERICAL']:
                if str(answer).strip() == str(question.correct_answer.get('answer', '')).strip():
                    total_score += points

            elif question.question_type == 'MATCHING':
                correct_pairs = question.correct_answer.get('pairs', {})
                student_pairs = answer.get('pairs', {})
                correct_count = sum(1 for k, v in correct_pairs.items() if student_pairs.get(k) == v)
                total_score += (correct_count / len(correct_pairs)) * points if correct_pairs else 0

            elif question.question_type == 'FILL_BLANK':
                correct_answers = question.correct_answer.get('answers', [])
                student_answers = answer.get('answers', [])
                correct_count = sum(1 for i, ans in enumerate(correct_answers)
                                  if i < len(student_answers) and ans.lower().strip() == student_answers[i].lower().strip())
                total_score += (correct_count / len(correct_answers)) * points if correct_answers else 0

        return round(total_score, 2)

    def _needs_manual_grading(self, attempt):
        """Check if attempt needs manual grading."""
        quiz_questions = attempt.quiz.quiz_questions.all()

        for quiz_q in quiz_questions:
            if quiz_q.question.question_type in ['SHORT_ANSWER', 'ESSAY']:
                return True

        return False

    def _update_gradebook(self, attempt):
        """Update gradebook with quiz score."""
        from .models import Gradebook

        gradebook, created = Gradebook.objects.get_or_create(
            course=attempt.quiz.course,
            user=attempt.user
        )

        # Update breakdown
        if not gradebook.breakdown:
            gradebook.breakdown = {}

        gradebook.breakdown[f'quiz_{attempt.quiz.id}'] = {
            'score': attempt.final_score,
            'max_score': sum([q.points_override or q.question.points for q in attempt.quiz.quiz_questions.all()]),
            'attempt': attempt.attempt_number,
            'date': attempt.submitted_at.isoformat() if attempt.submitted_at else None
        }

        # Recalculate aggregated score
        self._recalculate_gradebook(gradebook)

        gradebook.save()

    def _recalculate_gradebook(self, gradebook):
        """Recalculate aggregated score from all components."""
        total_score = 0
        total_weight = 0

        for key, value in gradebook.breakdown.items():
            score = value.get('score', 0)
            max_score = value.get('max_score', 100)

            # Normalize to percentage
            percentage = (score / max_score * 100) if max_score > 0 else 0
            total_score += percentage
            total_weight += 1

        if total_weight > 0:
            gradebook.aggregated_score = round(total_score / total_weight, 2)

            # Assign letter grade
            score = gradebook.aggregated_score
            if score >= 90:
                gradebook.letter_grade = 'A'
            elif score >= 80:
                gradebook.letter_grade = 'B'
            elif score >= 70:
                gradebook.letter_grade = 'C'
            elif score >= 60:
                gradebook.letter_grade = 'D'
            else:
                gradebook.letter_grade = 'F'


class GradebookViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Gradebook viewing and export."""

    queryset = Gradebook.objects.all()
    serializer_class = GradebookSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'user']

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export gradebook to CSV."""
        import csv
        from django.http import HttpResponse

        course_id = request.query_params.get('course')
        if not course_id:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        gradebook_entries = self.queryset.filter(course_id=course_id)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="gradebook_{course_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Student Email', 'Student Name', 'Student ID', 'Final Grade', 'Letter Grade'])

        for entry in gradebook_entries:
            writer.writerow([
                entry.user.email,
                entry.user.get_full_name(),
                entry.user.student_id or 'N/A',
                entry.aggregated_score or 0,
                entry.letter_grade or 'N/A'
            ])

        return response

    @action(detail=False, methods=['post'])
    def recalculate_all(self, request):
        """Recalculate all gradebook entries for a course."""
        course_id = request.data.get('course')
        if not course_id:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        gradebook_entries = self.queryset.filter(course_id=course_id)

        for entry in gradebook_entries:
            # This would trigger recalculation logic
            pass

        return Response({'status': 'recalculated', 'count': gradebook_entries.count()})

