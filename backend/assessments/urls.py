from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssignmentViewSet, QuestionBankViewSet, QuizViewSet,
    QuizAttemptViewSet, GradebookViewSet
)

router = DefaultRouter()
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'questions', QuestionBankViewSet, basename='question')
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'attempts', QuizAttemptViewSet, basename='attempt')
router.register(r'gradebook', GradebookViewSet, basename='gradebook')

urlpatterns = [
    path('', include(router.urls)),
]
