from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GradebookViewSet, GradebookCategoryViewSet, CourseGradeSummaryViewSet

router = DefaultRouter()
router.register(r'entries', GradebookViewSet, basename='gradebook-entry')
router.register(r'categories', GradebookCategoryViewSet, basename='gradebook-category')
router.register(r'summaries', CourseGradeSummaryViewSet, basename='grade-summary')

urlpatterns = [
    path('', include(router.urls)),
]

