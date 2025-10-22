from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, CustomLoginView, CustomLogoutView, CurrentUserView, TokenCookieRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # JWT Authentication - Custom login that returns user data and sets cookies
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', CustomLogoutView.as_view(), name='logout'),
    path('refresh/', TokenCookieRefreshView.as_view(), name='token_refresh_cookie'),
    path('me/', CurrentUserView.as_view(), name='current-user'),

    # User management
    path('', include(router.urls)),
]
