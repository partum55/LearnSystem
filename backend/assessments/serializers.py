from rest_framework import serializers
from .models import Assignment, Quiz, QuestionBank, QuizQuestion, QuizAttempt


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Assignment model."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    module_title = serializers.CharField(source='module.title', read_only=True)
    module_id = serializers.UUIDField(source='module.id', read_only=True)
    requires_submission = serializers.SerializerMethodField()
    submissions_count = serializers.SerializerMethodField()
    graded_count = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()
    prerequisites_ids = serializers.PrimaryKeyRelatedField(
        source='prerequisites',
        many=True,
        read_only=True
    )

    class Meta:
        model = Assignment
        fields = [
            'id', 'course', 'course_code', 'module', 'module_id', 'module_title',
            'position', 'category', 'assignment_type', 'title', 'description',
            'description_format', 'instructions', 'instructions_format',
            'resources', 'starter_code', 'solution_code',
            'max_points', 'due_date', 'available_from', 'available_until',
            'rubric', 'allow_late_submission', 'late_penalty_percent', 'submission_types',
            'allowed_file_types', 'max_file_size', 'max_files', 'programming_language',
            'auto_grading_enabled', 'test_cases', 'quiz', 'external_tool_url',
            'external_tool_config', 'grade_anonymously', 'peer_review_enabled',
            'peer_reviews_required', 'tags', 'prerequisites_ids', 'estimated_duration',
            'is_template', 'is_archived', 'original_assignment', 'is_published',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'requires_submission', 'submissions_count', 'graded_count', 'completion_rate'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_requires_submission(self, obj):
        return obj.requires_submission()

    def get_submissions_count(self, obj):
        return obj.submissions.count()

    def get_graded_count(self, obj):
        return obj.submissions.filter(status='GRADED').count()

    def get_completion_rate(self, obj):
        return obj.get_completion_rate()


class QuestionBankSerializer(serializers.ModelSerializer):
    """Serializer for QuestionBank model."""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = QuestionBank
        fields = [
            'id', 'course', 'question_type', 'stem', 'options', 'correct_answer',
            'explanation', 'points', 'metadata', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Serializer for QuizQuestion model."""
    
    question_detail = QuestionBankSerializer(source='question', read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'quiz', 'question', 'question_detail', 'position', 'points_override'
        ]
        read_only_fields = ['id']


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for Quiz model."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    quiz_questions = QuizQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'course', 'title', 'description', 'time_limit', 'attempts_allowed',
            'shuffle_questions', 'shuffle_answers', 'show_correct_answers',
            'show_correct_answers_at', 'pass_percentage', 'created_at', 'updated_at',
            'created_by', 'created_by_name', 'quiz_questions', 'questions_count', 'total_points'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_questions_count(self, obj):
        return obj.quiz_questions.count()

    def get_total_points(self, obj):
        total = 0
        for qq in obj.quiz_questions.all():
            total += qq.points_override if qq.points_override else qq.question.points
        return total


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for QuizAttempt model."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.get_full_name', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name', 'user_email',
            'attempt_number', 'started_at', 'submitted_at', 'answers',
            'auto_score', 'manual_score', 'final_score', 'graded_by',
            'graded_by_name', 'graded_at', 'feedback'
        ]
        read_only_fields = ['id', 'started_at', 'attempt_number']


class AssignmentDetailSerializer(AssignmentSerializer):
    """Detailed serializer for Assignment with related quiz info."""

    quiz_detail = QuizSerializer(source='quiz', read_only=True)
    submissions_count = serializers.SerializerMethodField()

    class Meta(AssignmentSerializer.Meta):
        fields = AssignmentSerializer.Meta.fields + ['quiz_detail', 'submissions_count']

    def get_submissions_count(self, obj):
        return obj.submissions.count()
