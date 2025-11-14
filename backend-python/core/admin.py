from django.contrib import admin
from .models import AuditLog, CalendarEvent, NotificationPreference, ContentVersion, Rubric, CannedResponse


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'resource_type', 'user', 'created_at')
    list_filter = ('action', 'resource_type', 'created_at')
    search_fields = ('user__email', 'resource_type', 'action')
    readonly_fields = ('created_at',)


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'event_type', 'start_time', 'end_time')
    list_filter = ('event_type', 'course')
    search_fields = ('title', 'description')
    date_hierarchy = 'start_time'


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_enabled', 'push_enabled', 'in_app_enabled', 'digest_frequency')
    list_filter = ('digest_frequency', 'email_enabled', 'push_enabled')


@admin.register(ContentVersion)
class ContentVersionAdmin(admin.ModelAdmin):
    list_display = ('resource_type', 'resource_id', 'version_number', 'created_by', 'created_at')
    list_filter = ('resource_type', 'created_at')
    search_fields = ('resource_id',)


@admin.register(Rubric)
class RubricAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'created_by', 'created_at')
    list_filter = ('course', 'created_at')
    search_fields = ('title',)


@admin.register(CannedResponse)
class CannedResponseAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    search_fields = ('title', 'content')
