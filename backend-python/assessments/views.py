from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Avg
from .models import Assignment, QuestionBank, Quiz, QuizAttempt, QuizQuestion
from .serializers import (
    AssignmentSerializer, QuestionBankSerializer,
    QuizSerializer, QuizAttemptSerializer
)


class AssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Assignment management."""

    queryset = Assignment.objects.select_related('course', 'created_by', 'quiz', 'module').prefetch_related('submissions')
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'is_published', 'module']

    def get_queryset(self):
        """Optimize queryset with select_related and prefetch_related."""
        return Assignment.objects.select_related(
            'course', 'created_by', 'quiz', 'module'
        ).prefetch_related('submissions')

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
            'completion_rate': assignment.get_completion_rate(),
        }

        return Response(stats)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate an assignment."""
        assignment = self.get_object()
        course_id = request.data.get('course_id')

        # Verify user has permission to create assignments in target course
        from courses.models import Course
        if course_id:
            target_course = Course.objects.get(id=course_id)
        else:
            target_course = assignment.course

        new_assignment = assignment.duplicate(
            created_by=request.user,
            course=target_course
        )

        serializer = self.get_serializer(new_assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive/unarchive an assignment."""
        assignment = self.get_object()
        assignment.is_archived = not assignment.is_archived
        assignment.save()

        serializer = self.get_serializer(assignment)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_publish(self, request):
        """Bulk publish/unpublish assignments."""
        assignment_ids = request.data.get('assignment_ids', [])
        publish = request.data.get('publish', True)

        assignments = Assignment.objects.filter(id__in=assignment_ids)
        assignments.update(is_published=publish)

        return Response({
            'updated': assignments.count(),
            'published': publish
        })

    @action(detail=False, methods=['post'])
    def bulk_archive(self, request):
        """Bulk archive assignments."""
        assignment_ids = request.data.get('assignment_ids', [])
        archive = request.data.get('archive', True)

        assignments = Assignment.objects.filter(id__in=assignment_ids)
        assignments.update(is_archived=archive)

        return Response({
            'updated': assignments.count(),
            'archived': archive
        })

    @action(detail=True, methods=['post'])
    def save_as_template(self, request, pk=None):
        """Save assignment as a template."""
        assignment = self.get_object()
        assignment.is_template = True
        assignment.save()

        serializer = self.get_serializer(assignment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get all assignment templates."""
        templates = Assignment.objects.filter(is_template=True)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def check_prerequisites(self, request, pk=None):
        """Check if user has met prerequisites for this assignment."""
        assignment = self.get_object()
        user = request.user

        prerequisites_met = assignment.check_prerequisites_met(user)
        missing_prerequisites = []

        if not prerequisites_met:
            for prereq in assignment.prerequisites.all():
                from submissions.models import Submission
                submission = Submission.objects.filter(
                    assignment=prereq,
                    user=user,
                    status='GRADED'
                ).first()
                if not submission:
                    missing_prerequisites.append({
                        'id': str(prereq.id),
                        'title': prereq.title
                    })

        return Response({
            'prerequisites_met': prerequisites_met,
            'missing_prerequisites': missing_prerequisites
        })


class QuestionBankViewSet(viewsets.ModelViewSet):
    """ViewSet for Question Bank management."""

    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course', 'question_type']

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

    queryset = Quiz.objects.select_related('course', 'created_by').prefetch_related(
        'quiz_questions__question'
    )
    serializer_class = QuizSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['course']

    def get_queryset(self):
        """Optimize queryset with proper relationships."""
        return Quiz.objects.select_related(
            'course', 'created_by'
        ).prefetch_related(
            'quiz_questions__question',
            'quiz_questions__question__created_by'
        )

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

        # Check max attempts
        attempts_count = QuizAttempt.objects.filter(quiz=quiz, user=user).count()
        if attempts_count >= quiz.attempts_allowed:
            return Response(
                {'error': f'Maximum attempts ({quiz.attempts_allowed}) reached'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=user,
            attempt_number=attempts_count + 1
        )

        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get quiz statistics."""
        quiz = self.get_object()
        attempts = quiz.attempts.filter(submitted_at__isnull=False)

        stats = {
            'total_attempts': quiz.attempts.count(),
            'completed_attempts': attempts.count(),
            'average_score': attempts.aggregate(Avg('final_score'))['final_score__avg'],
            'pass_rate': self._calculate_pass_rate(quiz, attempts),
        }

        return Response(stats)

    def _calculate_pass_rate(self, quiz, attempts):
        """Calculate percentage of attempts with passing score."""
        if not attempts.exists():
            return 0
        total = attempts.count()
        passed = attempts.filter(final_score__gte=quiz.pass_percentage).count()
        return round((passed / total) * 100, 2)


class QuizAttemptViewSet(viewsets.ModelViewSet):
    """ViewSet for Quiz Attempt management."""

    queryset = QuizAttempt.objects.all()
    serializer_class = QuizAttemptSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['quiz', 'user']

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit quiz attempt and auto-grade."""
        attempt = self.get_object()

        if attempt.submitted_at:
            return Response(
                {'error': 'Attempt already submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get('answers', {})
        attempt.answers = answers
        attempt.submitted_at = timezone.now()

        # Auto-grade objective questions
        auto_score = self._auto_grade_attempt(attempt)
        attempt.auto_score = auto_score

        # Check if manual grading is needed
        needs_manual = self._needs_manual_grading(attempt)
        if not needs_manual:
            attempt.final_score = auto_score

        attempt.save()

        serializer = self.get_serializer(attempt)
        return Response(serializer.data)

    def _auto_grade_attempt(self, attempt):
        """Auto-grade objective questions."""
        total_score = 0
        quiz_questions = attempt.quiz.quiz_questions.all()

        for quiz_q in quiz_questions:
            question = quiz_q.question
            points = quiz_q.points_override if quiz_q.points_override else question.points

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
            if quiz_q.question.question_type in ['SHORT_ANSWER', 'ESSAY', 'CODE']:
                return True

        return False
