from django.contrib import admin
from .models import Course, CourseMember, Module, Resource, Announcement


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Admin interface for Course model."""

    list_display = ['code', 'title_uk', 'owner', 'visibility', 'is_published', 'created_at']
    list_filter = ['visibility', 'is_published', 'created_at']
    search_fields = ['code', 'title_uk', 'title_en', 'owner__email']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Info', {
            'fields': ('code', 'owner', 'visibility', 'is_published', 'thumbnail')
        }),
        ('Content (Ukrainian)', {
            'fields': ('title_uk', 'description_uk')
        }),
        ('Content (English)', {
            'fields': ('title_en', 'description_en')
        }),
        ('Additional Info', {
            'fields': ('syllabus', 'start_date', 'end_date', 'max_students')
        }),
    )


@admin.register(CourseMember)
class CourseMemberAdmin(admin.ModelAdmin):
    """Admin interface for CourseMember model."""

    list_display = ['user', 'course', 'role_in_course', 'final_grade', 'added_at']
    list_filter = ['role_in_course', 'added_at']
    search_fields = ['user__email', 'course__code', 'course__title_uk']
    date_hierarchy = 'added_at'


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    """Admin interface for Module model."""

    list_display = ['title', 'course', 'position', 'is_published', 'created_at']
    list_filter = ['is_published', 'created_at']
    search_fields = ['title', 'course__code']
    ordering = ['course', 'position']


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    """Admin interface for Resource model."""

    list_display = ['title', 'module', 'resource_type', 'position', 'is_downloadable', 'created_at']
    list_filter = ['resource_type', 'is_downloadable', 'created_at']
    search_fields = ['title', 'module__title']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    """Admin interface for Announcement model."""

    list_display = ['title', 'course', 'author', 'is_pinned', 'created_at']
    list_filter = ['is_pinned', 'created_at']
    search_fields = ['title', 'content', 'course__code']
    date_hierarchy = 'created_at'
