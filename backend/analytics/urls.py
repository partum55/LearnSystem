from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseAnalyticsViewSet, StudentActivityViewSet, QuestionStatisticsViewSet

router = DefaultRouter()
router.register(r'course-analytics', CourseAnalyticsViewSet, basename='course-analytics')
router.register(r'student-activity', StudentActivityViewSet, basename='student-activity')
router.register(r'question-statistics', QuestionStatisticsViewSet, basename='question-statistics')

urlpatterns = [
    path('', include(router.urls)),
]
