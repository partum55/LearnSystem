from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from .models import Submission, SubmissionFile, SubmissionComment
from .serializers import (
    SubmissionSerializer, SubmissionCreateSerializer, SubmissionGradeSerializer,
    SubmissionFileSerializer, SubmissionCommentSerializer
)


class SubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for Submission management with SpeedGrader functionality."""

    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['assignment', 'user', 'status']
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return SubmissionCreateSerializer
        return SubmissionSerializer

    def get_queryset(self):
        user = self.request.user

        # Teachers/TAs see all submissions
        if user.role in ['SUPERADMIN', 'TEACHER', 'TA']:
            return Submission.objects.all()

        # Students see only their own
        return Submission.objects.filter(user=user)

    def perform_create(self, serializer):
        assignment = serializer.validated_data['assignment']

        # Check if assignment is available
        now = timezone.now()
        if assignment.available_from and now < assignment.available_from:
            raise serializers.ValidationError('Assignment is not yet available')

        # Check deadline (unless late submissions allowed)
        is_late = False
        days_late = 0

        if assignment.due_date and now > assignment.due_date:
            if not assignment.allow_late_submission:
                raise serializers.ValidationError('Assignment deadline has passed')

            is_late = True
            days_late = (now - assignment.due_date).days

        serializer.save(
            user=self.request.user,
            is_late=is_late,
            days_late=days_late
        )

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_file(self, request, pk=None):
        """Upload a file to submission."""
        submission = self.get_object()

        if submission.user != request.user:
            return Response(
                {'error': 'You can only upload files to your own submissions'},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status in ['GRADED', 'RETURNED']:
            return Response(
                {'error': 'Cannot upload files to graded submissions'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create submission file
        submission_file = SubmissionFile.objects.create(
            submission=submission,
            file=file,
            filename=file.name,
            file_size=file.size,
            file_type=file.content_type
        )

        serializer = SubmissionFileSerializer(submission_file, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit the submission for grading."""
        submission = self.get_object()

        if submission.user != request.user:
            return Response(
                {'error': 'You can only submit your own submissions'},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status != 'DRAFT':
            return Response(
                {'error': 'Submission already submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.status = 'SUBMITTED'
        submission.submitted_at = timezone.now()
        submission.save()

        # Send notification to teacher (implement in notifications service)

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        """Grade a submission (SpeedGrader functionality)."""
        submission = self.get_object()

        if request.user.role not in ['SUPERADMIN', 'TEACHER', 'TA']:
            return Response(
                {'error': 'Only teachers can grade submissions'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SubmissionGradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        grade = serializer.validated_data['grade']
        max_points = submission.assignment.max_points

        if grade > max_points:
            return Response(
                {'error': f'Grade cannot exceed {max_points}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply late penalty if applicable
        if submission.is_late and submission.assignment.late_penalty_percent > 0:
            penalty = (submission.assignment.late_penalty_percent / 100) * submission.days_late
            grade = grade * (1 - min(penalty, 1))  # Cap at 100% penalty
            grade = round(grade, 2)

        submission.grade = grade
        submission.feedback = serializer.validated_data.get('feedback', '')
        submission.rubric_evaluation = serializer.validated_data.get('rubric_evaluation', {})
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.status = 'GRADED'
        submission.save()

        # Update gradebook
        self._update_gradebook(submission)

        # Send notification to student

        response_serializer = self.get_serializer(submission)
        return Response(response_serializer.data)

    def _update_gradebook(self, submission):
        """Update gradebook with assignment score."""
        from assessments.models import Gradebook

        gradebook, created = Gradebook.objects.get_or_create(
            course=submission.assignment.course,
            user=submission.user
        )

        if not gradebook.breakdown:
            gradebook.breakdown = {}

        gradebook.breakdown[f'assignment_{submission.assignment.id}'] = {
            'score': float(submission.grade),
            'max_score': float(submission.assignment.max_points),
            'date': submission.graded_at.isoformat() if submission.graded_at else None,
            'is_late': submission.is_late
        }

        # Recalculate aggregated score
        self._recalculate_gradebook(gradebook)
        gradebook.save()

    def _recalculate_gradebook(self, gradebook):
        """Recalculate total grade."""
        total_score = 0
        total_weight = 0

        for key, value in gradebook.breakdown.items():
            score = value.get('score', 0)
            max_score = value.get('max_score', 100)
            percentage = (score / max_score * 100) if max_score > 0 else 0
            total_score += percentage
            total_weight += 1

        if total_weight > 0:
            gradebook.aggregated_score = round(total_score / total_weight, 2)

            # Letter grade
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

    @action(detail=False, methods=['get'])
    def speedgrader(self, request):
        """
        Get submissions for SpeedGrader interface.
        Returns ungraded submissions first, then recently graded.
        """
        assignment_id = request.query_params.get('assignment')
        if not assignment_id:
            return Response(
                {'error': 'assignment parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ungraded submissions
        ungraded = Submission.objects.filter(
            assignment_id=assignment_id,
            status='SUBMITTED'
        ).order_by('submitted_at')

        # Recently graded
        graded = Submission.objects.filter(
            assignment_id=assignment_id,
            status='GRADED'
        ).order_by('-graded_at')[:10]

        ungraded_serializer = self.get_serializer(ungraded, many=True)
        graded_serializer = self.get_serializer(graded, many=True)

        return Response({
            'ungraded': ungraded_serializer.data,
            'recently_graded': graded_serializer.data,
            'total_ungraded': ungraded.count()
        })

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to submission."""
        submission = self.get_object()

        serializer = SubmissionCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.save(
            submission=submission,
            author=request.user
        )

        response_serializer = SubmissionCommentSerializer(comment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SubmissionCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for submission comments."""

    queryset = SubmissionComment.objects.all()
    serializer_class = SubmissionCommentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['submission', 'author']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

