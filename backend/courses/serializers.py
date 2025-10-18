from rest_framework import serializers
from .models import Course, CourseMember, Module, Resource, Announcement


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model."""
    
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    members_count = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'code', 'title', 'title_uk', 'title_en', 'description', 'description_uk', 'description_en',
            'syllabus', 'owner', 'owner_name', 'visibility', 'thumbnail',
            'start_date', 'end_date', 'max_students', 'is_published',
            'created_at', 'updated_at', 'members_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']
    
    def get_title(self, obj):
        """Return title based on request language or default to Ukrainian."""
        request = self.context.get('request')
        lang = getattr(request, 'LANGUAGE_CODE', 'uk') if request else 'uk'
        return obj.title_uk if lang == 'uk' else (obj.title_en or obj.title_uk)

    def get_description(self, obj):
        """Return description based on request language or default to Ukrainian."""
        request = self.context.get('request')
        lang = getattr(request, 'LANGUAGE_CODE', 'uk') if request else 'uk'
        return obj.description_uk if lang == 'uk' else (obj.description_en or obj.description_uk)

    def get_members_count(self, obj):
        return obj.members.filter(role_in_course='STUDENT').count()


class CourseMemberSerializer(serializers.ModelSerializer):
    """Serializer for CourseMember model."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = CourseMember
        fields = [
            'id', 'course', 'user', 'user_email', 'user_name',
            'role_in_course', 'added_by', 'added_at', 'final_grade'
        ]
        read_only_fields = ['id', 'added_at', 'added_by']


class ModuleSerializer(serializers.ModelSerializer):
    """Serializer for Module model."""
    
    resources_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Module
        fields = [
            'id', 'course', 'title', 'description', 'position',
            'content_meta', 'is_published', 'publish_date',
            'created_at', 'updated_at', 'resources_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_resources_count(self, obj):
        return obj.resources.count()


class ResourceSerializer(serializers.ModelSerializer):
    """Serializer for Resource model."""
    
    class Meta:
        model = Resource
        fields = [
            'id', 'module', 'title', 'description', 'resource_type',
            'file', 'external_url', 'text_content', 'storage_path',
            'metadata', 'position', 'is_downloadable',
            'created_at', 'updated_at', 'uploaded_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by']


class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for Announcement model."""
    
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'course', 'title', 'content', 'author',
            'author_name', 'is_pinned', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'author']
