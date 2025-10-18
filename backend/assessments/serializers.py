from rest_framework import serializers
from .models import Assignment, QuestionBank, Quiz, QuizAttempt, Gradebook, QuizQuestion


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Assignment model."""
    
    course_code = serializers.CharField(source='course.code', read_only=True)
    creator_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    submissions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Assignment
        fields = [
            'id', 'course', 'course_code', 'title', 'description', 'instructions',
            'max_points', 'due_date', 'available_from', 'available_until',
            'rubric', 'allow_late_submission', 'late_penalty_percent',
            'submission_types', 'is_published', 'created_at', 'updated_at',
            'created_by', 'creator_name', 'submissions_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_submissions_count(self, obj):
        return obj.submissions.count()


class QuestionBankSerializer(serializers.ModelSerializer):
    """Serializer for QuestionBank model."""
    
    course_code = serializers.CharField(source='course.code', read_only=True)
    
    class Meta:
        model = QuestionBank
        fields = [
            'id', 'course', 'course_code', 'question_type', 'stem',
            'options', 'correct_answer', 'explanation', 'points',
            'metadata', 'tags', 'is_active', 'created_at', 'updated_at',
            'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Serializer for QuizQuestion model."""
    
    question_detail = QuestionBankSerializer(source='question', read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'quiz', 'question', 'question_detail', 'position', 'points_override']


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for Quiz model."""
    
    course_code = serializers.CharField(source='course.code', read_only=True)
    questions_list = QuizQuestionSerializer(source='quiz_questions', many=True, read_only=True)
    total_points = serializers.SerializerMethodField()
    attempts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'course', 'course_code', 'title', 'description', 'instructions',
            'time_limit_minutes', 'max_attempts', 'shuffle_questions', 'shuffle_answers',
            'show_correct_answers', 'show_correct_answers_date',
            'available_from', 'available_until', 'is_published',
            'created_at', 'updated_at', 'created_by',
            'questions_list', 'total_points', 'attempts_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_total_points(self, obj):
        return sum([
            q.points_override or q.question.points 
            for q in obj.quiz_questions.all()
        ])
    
    def get_attempts_count(self, obj):
        return obj.attempts.count()


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for QuizAttempt model."""
    
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name', 'attempt_number',
            'status', 'started_at', 'submitted_at', 'answers',
            'auto_score', 'manual_score', 'final_score',
            'graded_by', 'graded_at', 'feedback'
        ]
        read_only_fields = ['id', 'started_at', 'auto_score', 'graded_by', 'graded_at']


class GradebookSerializer(serializers.ModelSerializer):
    """Serializer for Gradebook model."""
    
    course_code = serializers.CharField(source='course.code', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Gradebook
        fields = [
            'id', 'course', 'course_code', 'user', 'user_name', 'user_email',
            'aggregated_score', 'breakdown', 'letter_grade', 'last_calculated'
        ]
        read_only_fields = ['id', 'last_calculated']

