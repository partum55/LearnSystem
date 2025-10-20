from rest_framework import serializers
from .models import Submission, SubmissionFile, SubmissionComment


class SubmissionFileSerializer(serializers.ModelSerializer):
    """Serializer for SubmissionFile model."""

    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SubmissionFile
        fields = ['id', 'filename', 'file', 'file_url', 'file_size', 'file_type', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at', 'file_size', 'file_type']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class SubmissionCommentSerializer(serializers.ModelSerializer):
    """Serializer for SubmissionComment model."""

    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = SubmissionComment
        fields = [
            'id', 'submission', 'author', 'author_name', 'author_email',
            'comment', 'attachments', 'is_draft', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class SubmissionSerializer(serializers.ModelSerializer):
    """Serializer for Submission model."""

    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    student_name = serializers.CharField(source='user.get_full_name', read_only=True)
    student_email = serializers.EmailField(source='user.email', read_only=True)
    grader_name = serializers.CharField(source='graded_by.get_full_name', read_only=True, allow_null=True)

    uploaded_files = SubmissionFileSerializer(many=True, read_only=True)
    comments = SubmissionCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'assignment', 'assignment_title', 'user', 'student_name', 'student_email',
            'status', 'text_answer', 'files', 'submission_url', 'metadata',
            'grade', 'graded_by', 'grader_name', 'graded_at', 'feedback',
            'rubric_evaluation', 'submitted_at', 'created_at', 'updated_at',
            'is_late', 'days_late', 'uploaded_files', 'comments'
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at', 'graded_by',
            'graded_at', 'is_late', 'days_late'
        ]


class SubmissionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating submissions."""

    class Meta:
        model = Submission
        fields = ['assignment', 'text_answer', 'submission_url', 'metadata', 'status']
        extra_kwargs = {
            'status': {'default': 'DRAFT'}
        }

    def validate(self, data):
        """Validate that user doesn't already have a submission for this assignment."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            assignment = data.get('assignment')
            # Check if submission already exists
            existing = Submission.objects.filter(
                assignment=assignment,
                user=request.user
            ).first()

            if existing:
                # Return existing submission ID in error message
                raise serializers.ValidationError({
                    'detail': 'Submission already exists for this assignment',
                    'existing_submission_id': str(existing.id)
                })

        return data


class SubmissionGradeSerializer(serializers.Serializer):
    """Serializer for grading submissions."""

    grade = serializers.DecimalField(max_digits=6, decimal_places=2, required=True)
    feedback = serializers.CharField(required=False, allow_blank=True)
    rubric_evaluation = serializers.JSONField(required=False)
