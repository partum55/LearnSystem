"""URL configuration for core app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuditLogViewSet,
    CalendarEventViewSet,
    NotificationPreferenceViewSet,
    ContentVersionViewSet,
    RubricViewSet,
    CannedResponseViewSet,
)

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'calendar-events', CalendarEventViewSet, basename='calendar-event')
router.register(r'notification-preferences', NotificationPreferenceViewSet, basename='notification-preference')
router.register(r'content-versions', ContentVersionViewSet, basename='content-version')
router.register(r'rubrics', RubricViewSet, basename='rubric')
router.register(r'canned-responses', CannedResponseViewSet, basename='canned-response')

urlpatterns = [
    path('', include(router.urls)),
]
