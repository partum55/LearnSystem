from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubmissionViewSet, SubmissionCommentViewSet

router = DefaultRouter()
router.register(r'submissions', SubmissionViewSet, basename='submission')
router.register(r'comments', SubmissionCommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
]
