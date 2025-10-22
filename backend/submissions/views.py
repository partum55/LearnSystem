from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers as drf_serializers
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
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return SubmissionCreateSerializer
        elif self.action == 'grade':
            return SubmissionGradeSerializer
        return SubmissionSerializer

    def get_queryset(self):
        user = self.request.user

        # Teachers/TAs see all submissions for their courses
        if hasattr(user, 'role') and user.role in ['SUPERADMIN', 'TEACHER', 'TA']:
            return Submission.objects.all()

        # Students see only their own
        return Submission.objects.filter(user=user)

    def perform_create(self, serializer):
        assignment = serializer.validated_data['assignment']

        # Check if submission already exists - if yes, return it instead of error
        existing = Submission.objects.filter(
            assignment=assignment,
            user=self.request.user
        ).first()

        if existing:
            # Don't create new, just skip (frontend will handle getting existing)
            return existing

        # Check if assignment is available
        now = timezone.now()
        if assignment.available_from and now < assignment.available_from:
            raise drf_serializers.ValidationError('Assignment is not yet available')

        # Check deadline (unless late submissions allowed)
        is_late = False
        days_late = 0

        if assignment.due_date and now > assignment.due_date:
            if not assignment.allow_late_submission:
                raise drf_serializers.ValidationError('Assignment deadline has passed')

            is_late = True
            days_late = (now.date() - assignment.due_date.date()).days

        serializer.save(
            user=self.request.user,
            is_late=is_late,
            days_late=days_late
        )

    def create(self, request, *args, **kwargs):
        """Override create to handle existing submissions gracefully."""
        assignment_id = request.data.get('assignment')

        # Check if submission already exists BEFORE trying to create
        existing = Submission.objects.filter(
            assignment_id=assignment_id,
            user=request.user
        ).first()

        if existing:
            # Return existing submission with 200 status
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Create new submission using parent's create method
        # But we need to bypass perform_create's existing check since we already checked
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignment = serializer.validated_data['assignment']

        # Check if assignment is available
        now = timezone.now()
        if assignment.available_from and now < assignment.available_from:
            return Response(
                {'error': 'Assignment is not yet available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check deadline (unless late submissions allowed)
        is_late = False
        days_late = 0

        if assignment.due_date and now > assignment.due_date:
            if not assignment.allow_late_submission:
                return Response(
                    {'error': 'Assignment deadline has passed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            is_late = True
            days_late = (now.date() - assignment.due_date.date()).days

        # Save the submission
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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

        # Validate file type
        assignment = submission.assignment
        if assignment.allowed_file_types:
            file_ext = '.' + file.name.split('.')[-1].lower()
            if file_ext not in assignment.allowed_file_types:
                return Response(
                    {'error': f'File type {file_ext} not allowed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validate file size
        if file.size > assignment.max_file_size:
            return Response(
                {'error': f'File size exceeds maximum of {assignment.max_file_size} bytes'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check max files count
        current_files_count = submission.uploaded_files.count()
        if current_files_count >= assignment.max_files:
            return Response(
                {'error': f'Maximum {assignment.max_files} files allowed'},
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
                {'error': 'You can only submit your own work'},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status == 'SUBMITTED':
            return Response(
                {'error': 'Submission already submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate based on assignment type
        assignment = submission.assignment

        if assignment.assignment_type == 'FILE_UPLOAD':
            if submission.uploaded_files.count() == 0:
                return Response(
                    {'error': 'At least one file must be uploaded'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif assignment.assignment_type == 'TEXT':
            if not submission.text_answer:
                return Response(
                    {'error': 'Text answer is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif assignment.assignment_type == 'URL':
            if not submission.submission_url:
                return Response(
                    {'error': 'URL is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        submission.status = 'SUBMITTED'
        submission.submitted_at = timezone.now()
        submission.save()

        # Trigger auto-grading if enabled
        if hasattr(assignment, 'auto_grading_enabled') and assignment.auto_grading_enabled:
            self._run_auto_grading(submission)

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit_code(self, request, pk=None):
        """Submit code for a code assignment."""
        submission = self.get_object()

        if submission.user != request.user:
            return Response(
                {'error': 'You can only submit your own work'},
                status=status.HTTP_403_FORBIDDEN
            )

        code = request.data.get('code')
        language = request.data.get('language')

        if not code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save code to submission
        submission.text_answer = code
        if not submission.metadata:
            submission.metadata = {}
        submission.metadata['language'] = language
        submission.metadata['code_submitted_at'] = timezone.now().isoformat()
        submission.status = 'SUBMITTED'
        submission.submitted_at = timezone.now()
        submission.save()

        # Run auto-grading if enabled
        result = None
        assignment = submission.assignment
        if hasattr(assignment, 'auto_grading_enabled') and assignment.auto_grading_enabled:
            result = self._run_code_grading(submission, code, language)

        serializer = self.get_serializer(submission)
        response_data = serializer.data
        if result:
            response_data['grading_result'] = result

        return Response(response_data)

    @action(detail=True, methods=['post'])
    def submit_text(self, request, pk=None):
        """Submit text answer."""
        submission = self.get_object()

        if submission.user != request.user:
            return Response(
                {'error': 'You can only submit your own work'},
                status=status.HTTP_403_FORBIDDEN
            )

        text_answer = request.data.get('text_answer')

        if not text_answer:
            return Response(
                {'error': 'Text answer is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.text_answer = text_answer
        submission.status = 'SUBMITTED'
        submission.submitted_at = timezone.now()
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit_url(self, request, pk=None):
        """Submit URL link."""
        submission = self.get_object()

        if submission.user != request.user:
            return Response(
                {'error': 'You can only submit your own work'},
                status=status.HTTP_403_FORBIDDEN
            )

        submission_url = request.data.get('url')

        if not submission_url:
            return Response(
                {'error': 'URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.submission_url = submission_url
        submission.status = 'SUBMITTED'
        submission.submitted_at = timezone.now()
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    def _run_auto_grading(self, submission):
        """Run auto-grading for submission."""
        # Placeholder for auto-grading logic
        pass

    def _run_code_grading(self, submission, code, language):
        """Run auto-grading for code submission."""
        assignment = submission.assignment
        test_cases = getattr(assignment, 'test_cases', [])

        if not test_cases:
            return None

        results = {
            'total_tests': len(test_cases),
            'passed_tests': 0,
            'failed_tests': 0,
            'test_results': []
        }

        # TODO: Integrate with Judge0 or similar service
        # For now, return mock results
        for i, test_case in enumerate(test_cases):
            test_result = {
                'test_id': i + 1,
                'input': test_case.get('input'),
                'expected_output': test_case.get('expected_output'),
                'actual_output': '',  # From judge
                'passed': False,  # From judge
                'error': None,
            }
            results['test_results'].append(test_result)

        # Calculate grade based on passed tests
        if results['total_tests'] > 0:
            pass_percentage = (results['passed_tests'] / results['total_tests']) * 100
            submission.grade = (pass_percentage / 100) * float(assignment.max_points)
            if not submission.metadata:
                submission.metadata = {}
            submission.metadata['auto_grading_results'] = results
            submission.save()

        return results

    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        """Grade a submission (SpeedGrader functionality)."""
        submission = self.get_object()

        if not hasattr(request.user, 'role') or request.user.role not in ['SUPERADMIN', 'TEACHER', 'TA']:
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
        final_grade = grade
        if submission.is_late and submission.assignment.late_penalty_percent > 0:
            penalty = (submission.assignment.late_penalty_percent / 100) * submission.days_late
            final_grade = grade * (1 - min(penalty, 1))  # Cap at 100% penalty
            final_grade = round(final_grade, 2)

        submission.grade = final_grade
        submission.feedback = serializer.validated_data.get('feedback', '')
        submission.rubric_evaluation = serializer.validated_data.get('rubric_evaluation', {})
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.status = 'GRADED'
        submission.save()

        # Update gradebook
        self._update_gradebook(submission)

        response_serializer = self.get_serializer(submission)
        return Response(response_serializer.data)

    def _update_gradebook(self, submission):
        """Update gradebook with assignment score."""
        try:
            from gradebook.models import Gradebook

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
        except ImportError:
            # Gradebook module not available
            pass

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

        return Response(
            SubmissionCommentSerializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def auto_save(self, request, pk=None):
        """Auto-save draft submission (for periodic saves)."""
        submission = self.get_object()

        if submission.user != request.user:
            return Response(
                {'error': 'You can only edit your own submissions'},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status != 'DRAFT':
            return Response(
                {'error': 'Can only auto-save draft submissions'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update allowed fields
        text_answer = request.data.get('text_answer')
        submission_url = request.data.get('submission_url')
        metadata = request.data.get('metadata')

        if text_answer is not None:
            submission.text_answer = text_answer
        if submission_url is not None:
            submission.submission_url = submission_url
        if metadata is not None:
            submission.metadata = metadata

        submission.save()

        return Response({
            'status': 'saved',
            'updated_at': submission.updated_at
        })

    @action(detail=False, methods=['post'])
    def bulk_grade(self, request):
        """Bulk grade multiple submissions with the same feedback template."""
        if not hasattr(request.user, 'role') or request.user.role not in ['SUPERADMIN', 'TEACHER', 'TA']:
            return Response(
                {'error': 'Only teachers can grade submissions'},
                status=status.HTTP_403_FORBIDDEN
            )

        submission_ids = request.data.get('submission_ids', [])
        grade_data = request.data.get('grade_data', {})
        feedback = grade_data.get('feedback', '')
        apply_grade = grade_data.get('apply_grade', False)
        grade_value = grade_data.get('grade')

        if not submission_ids:
            return Response(
                {'error': 'submission_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submissions = Submission.objects.filter(id__in=submission_ids)
        updated_count = 0

        for submission in submissions:
            if feedback:
                submission.feedback = feedback

            if apply_grade and grade_value is not None:
                max_points = submission.assignment.max_points
                if grade_value > max_points:
                    continue

                # Apply late penalty if applicable
                final_grade = grade_value
                if submission.is_late and submission.assignment.late_penalty_percent > 0:
                    penalty = (submission.assignment.late_penalty_percent / 100) * submission.days_late
                    final_grade = grade_value * (1 - min(penalty, 1))
                    final_grade = round(final_grade, 2)

                submission.grade = final_grade
                submission.graded_by = request.user
                submission.graded_at = timezone.now()
                submission.status = 'GRADED'

            submission.save()

            if submission.status == 'GRADED':
                self._update_gradebook(submission)

            updated_count += 1

        return Response({
            'updated': updated_count,
            'total': len(submission_ids)
        })

    @action(detail=False, methods=['get'])
    def canned_responses(self, request):
        """Get canned feedback responses for quick grading."""
        # This could be stored in database or configuration
        responses = [
            {'id': 1, 'title': 'Great work!', 'text': 'Excellent submission. Well done!'},
            {'id': 2, 'title': 'Good effort', 'text': 'Good work overall. A few minor improvements could be made.'},
            {'id': 3, 'title': 'Needs improvement', 'text': 'Please review the assignment requirements and resubmit.'},
            {'id': 4, 'title': 'Late submission', 'text': 'This submission was received after the deadline. Late penalty applied.'},
            {'id': 5, 'title': 'Incomplete', 'text': 'This submission is incomplete. Please ensure all requirements are met.'},
        ]
        return Response(responses)


class SubmissionCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for submission comments."""

    queryset = SubmissionComment.objects.all()
    serializer_class = SubmissionCommentSerializer

    def get_queryset(self):
        user = self.request.user

        # Teachers/TAs see all comments
        if hasattr(user, 'role') and user.role in ['SUPERADMIN', 'TEACHER', 'TA']:
            return SubmissionComment.objects.all()

        # Students see only comments on their submissions
        return SubmissionComment.objects.filter(
            Q(submission__user=user) | Q(author=user)
        )

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
