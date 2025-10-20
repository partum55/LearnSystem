from django.contrib import admin
from .models import GradebookEntry, GradebookCategory, CourseGradeSummary, GradeHistory


@admin.register(GradebookEntry)
class GradebookEntryAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'assignment', 'score', 'max_score', 'percentage', 'status', 'graded_at']
    list_filter = ['status', 'is_late', 'is_excused', 'course']
    search_fields = ['student__email', 'student__display_name', 'assignment__title', 'course__code']
    readonly_fields = ['percentage', 'created_at', 'updated_at']
    raw_id_fields = ['student', 'assignment', 'submission', 'override_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('course', 'student', 'assignment', 'submission')
        }),
        ('Grade Information', {
            'fields': ('score', 'max_score', 'percentage', 'status', 'graded_at')
        }),
        ('Override', {
            'fields': ('override_score', 'override_by', 'override_at', 'override_reason'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_late', 'is_excused', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(GradebookCategory)
class GradebookCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'course', 'weight', 'drop_lowest', 'position']
    list_filter = ['course']
    search_fields = ['name', 'course__code']
    ordering = ['course', 'position']


@admin.register(CourseGradeSummary)
class CourseGradeSummaryAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'current_grade', 'letter_grade', 'assignments_completed', 'assignments_total', 'is_final']
    list_filter = ['is_final', 'course', 'letter_grade']
    search_fields = ['student__email', 'student__display_name', 'course__code']
    readonly_fields = ['last_calculated', 'created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('course', 'student')
        }),
        ('Grade Information', {
            'fields': ('current_grade', 'letter_grade', 'total_points_earned', 'total_points_possible')
        }),
        ('Progress', {
            'fields': ('assignments_completed', 'assignments_total', 'category_grades')
        }),
        ('Final Grade', {
            'fields': ('final_grade', 'is_final')
        }),
        ('Timestamps', {
            'fields': ('last_calculated', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(GradeHistory)
class GradeHistoryAdmin(admin.ModelAdmin):
    list_display = ['gradebook_entry', 'old_score', 'new_score', 'changed_by', 'changed_at']
    list_filter = ['changed_at']
    search_fields = ['gradebook_entry__student__email', 'changed_by__email']
    readonly_fields = ['changed_at']
    raw_id_fields = ['gradebook_entry', 'changed_by']
