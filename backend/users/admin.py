from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for custom User model."""

    list_display = ['email', 'display_name', 'role', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'locale', 'theme']
    search_fields = ['email', 'display_name', 'first_name', 'last_name', 'student_id']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('display_name', 'first_name', 'last_name', 'student_id', 'avatar', 'bio')}),
        (_('Permissions'), {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Preferences'), {'fields': ('locale', 'theme')}),
        (_('Important dates'), {'fields': ('last_login_at', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'display_name', 'password1', 'password2', 'role'),
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login_at']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile model."""

    list_display = ['user', 'phone_number', 'department', 'position']
    search_fields = ['user__email', 'phone_number', 'department']
    list_filter = ['department']

