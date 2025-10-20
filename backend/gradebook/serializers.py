from rest_framework import serializers
from .models import GradebookEntry, GradebookCategory, CourseGradeSummary, GradeHistory
from users.serializers import UserSerializer
from assessments.serializers import AssignmentSerializer


class GradebookEntrySerializer(serializers.ModelSerializer):
    """Serializer for gradebook entries."""
    
    student = UserSerializer(read_only=True)
    assignment = AssignmentSerializer(read_only=True)
    final_score = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        read_only=True,
        source='get_final_score'
    )
    
    class Meta:
        model = GradebookEntry
        fields = [
            'id', 'course', 'student', 'assignment', 'score', 'max_score',
            'percentage', 'status', 'is_late', 'is_excused', 'notes',
            'submission', 'override_score', 'override_by', 'override_at',
            'override_reason', 'graded_at', 'final_score', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'percentage']


class GradebookEntryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating gradebook entries (teacher use)."""
    
    class Meta:
        model = GradebookEntry
        fields = [
            'override_score', 'override_reason', 'is_excused', 'notes', 'status'
        ]


class GradebookCategorySerializer(serializers.ModelSerializer):
    """Serializer for gradebook categories."""
    
    class Meta:
        model = GradebookCategory
        fields = [
            'id', 'course', 'name', 'description', 'weight',
            'drop_lowest', 'position', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseGradeSummarySerializer(serializers.ModelSerializer):
    """Serializer for course grade summaries."""
    
    student = UserSerializer(read_only=True)
    completion_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = CourseGradeSummary
        fields = [
            'id', 'course', 'student', 'total_points_earned',
            'total_points_possible', 'current_grade', 'letter_grade',
            'category_grades', 'assignments_completed', 'assignments_total',
            'completion_percentage', 'final_grade', 'is_final',
            'last_calculated', 'created_at'
        ]
        read_only_fields = ['id', 'last_calculated', 'created_at']
    
    def get_completion_percentage(self, obj):
        """Calculate completion percentage."""
        if obj.assignments_total > 0:
            return round((obj.assignments_completed / obj.assignments_total) * 100, 2)
        return 0


class GradeHistorySerializer(serializers.ModelSerializer):
    """Serializer for grade history."""
    
    changed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = GradeHistory
        fields = [
            'id', 'gradebook_entry', 'old_score', 'new_score',
            'changed_by', 'change_reason', 'changed_at'
        ]
        read_only_fields = ['id', 'changed_at']


class StudentGradebookViewSerializer(serializers.Serializer):
    """Serializer for student's view of their gradebook."""
    
    summary = CourseGradeSummarySerializer()
    entries = GradebookEntrySerializer(many=True)
    categories = GradebookCategorySerializer(many=True)


class GradebookOverviewSerializer(serializers.Serializer):
    """Serializer for teacher's gradebook overview."""
    
    course_id = serializers.UUIDField()
    course_code = serializers.CharField()
    course_title = serializers.CharField()
    total_students = serializers.IntegerField()
    average_grade = serializers.DecimalField(max_digits=5, decimal_places=2)
    assignments = serializers.ListField()
    students = serializers.ListField()

