from rest_framework import serializers
from .models import CourseAnalytics, StudentActivity, QuestionStatistics


class CourseAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for CourseAnalytics model."""
    
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_title = serializers.CharField(source='course.title_uk', read_only=True)
    
    class Meta:
        model = CourseAnalytics
        fields = [
            'id', 'course', 'course_code', 'course_title',
            'total_students', 'active_students', 'average_grade',
            'completion_rate', 'total_submissions', 'total_quiz_attempts',
            'calculated_at'
        ]
        read_only_fields = ['id', 'calculated_at']


class StudentActivitySerializer(serializers.ModelSerializer):
    """Serializer for StudentActivity model."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    
    class Meta:
        model = StudentActivity
        fields = [
            'id', 'user', 'user_name', 'course', 'course_code',
            'activity_type', 'object_type', 'object_id', 'metadata',
            'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class QuestionStatisticsSerializer(serializers.ModelSerializer):
    """Serializer for QuestionStatistics model."""
    
    question_stem = serializers.CharField(source='question.stem', read_only=True)
    
    class Meta:
        model = QuestionStatistics
        fields = [
            'id', 'question', 'question_stem',
            'times_answered', 'times_correct', 'times_incorrect',
            'correct_rate', 'difficulty_index', 'discrimination_index',
            'average_time_seconds', 'last_calculated'
        ]
        read_only_fields = ['id', 'last_calculated']

