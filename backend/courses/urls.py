from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, ModuleViewSet, ResourceViewSet, AnnouncementViewSet

# Single router for modules, resources, and announcements
router = DefaultRouter()
router.register(r'modules', ModuleViewSet, basename='module')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

# Manual URLs for courses to avoid conflicts
course_list = CourseViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

course_detail = CourseViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

course_enroll_students = CourseViewSet.as_view({
    'post': 'enroll_students'
})

course_members = CourseViewSet.as_view({
    'get': 'members'
})

urlpatterns = [
    # Course endpoints
    path('', course_list, name='course-list'),
    path('<uuid:pk>/', course_detail, name='course-detail'),
    path('<uuid:pk>/enroll_students/', course_enroll_students, name='course-enroll-students'),
    path('<uuid:pk>/members/', course_members, name='course-members'),

    # Other viewsets via router
    path('', include(router.urls)),
]
