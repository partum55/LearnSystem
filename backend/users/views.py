from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from datetime import timedelta
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    PasswordChangeSerializer
)
from .models import UserProfile
import csv
import io
from django.middleware.csrf import get_token

User = get_user_model()

COOKIE_ACCESS_NAME = 'access_token'
COOKIE_REFRESH_NAME = 'refresh_token'
COOKIE_MAX_AGE_ACCESS = int(timedelta(days=1).total_seconds())  # 24 години
COOKIE_MAX_AGE_REFRESH = int(timedelta(days=30).total_seconds())  # 30 днів
COOKIE_KWARGS = {
    'httponly': True,
    'secure': not settings.DEBUG,
    'samesite': 'None' if not settings.DEBUG else 'Lax',
    'path': '/',
}


class CustomLoginView(APIView):
    """Custom login view that returns user data and sets JWT tokens in HttpOnly cookies."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate UCU email domain
        if not email.lower().endswith('@ucu.edu.ua'):
            return Response(
                {'error': 'Only @ucu.edu.ua email addresses are allowed'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        # Serialize user data
        user_serializer = UserSerializer(user)

        response = Response({
            'access': str(access),
            'user': user_serializer.data
        })
        # Ensure CSRF cookie is set for clients that need it
        get_token(request)
        # Set cookies with longer expiration
        response.set_cookie(COOKIE_ACCESS_NAME, str(access), max_age=COOKIE_MAX_AGE_ACCESS, **COOKIE_KWARGS)
        response.set_cookie(COOKIE_REFRESH_NAME, str(refresh), max_age=COOKIE_MAX_AGE_REFRESH, **COOKIE_KWARGS)
        return response


class TokenCookieRefreshView(APIView):
    """Refresh the access token using the refresh token stored in HttpOnly cookie."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_cookie = request.COOKIES.get(COOKIE_REFRESH_NAME)
        if not refresh_cookie:
            return Response({'error': 'No refresh token'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(refresh_cookie)
            access = refresh.access_token
        except TokenError as e:
            return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({'access': str(access)})
        response.set_cookie(COOKIE_ACCESS_NAME, str(access), max_age=COOKIE_MAX_AGE_ACCESS, **COOKIE_KWARGS)
        return response


class CurrentUserView(APIView):
    """Get and update current authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user profile."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Return full user data after update
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        """Update current user profile (full update)."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(APIView):
    """Change user password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Wrong password.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


class CustomLogoutView(APIView):
    """Logout view that blacklists the refresh token and clears cookies."""
    permission_classes = [permissions.AllowAny]  # Allow even without auth to clear cookies

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh') or request.COOKIES.get(COOKIE_REFRESH_NAME)
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except TokenError:
                    pass

            response = Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)

            # Delete cookies with the same parameters they were set with
            response.delete_cookie(
                COOKIE_ACCESS_NAME,
                path='/',
                samesite='None' if not settings.DEBUG else 'Lax',
            )
            response.delete_cookie(
                COOKIE_REFRESH_NAME,
                path='/',
                samesite='None' if not settings.DEBUG else 'Lax',
            )

            return response
        except Exception as e:
            # Even if there's an error, still try to clear cookies
            response = Response({'message': 'Logged out'}, status=status.HTTP_200_OK)
            response.delete_cookie(COOKIE_ACCESS_NAME, path='/')
            response.delete_cookie(COOKIE_REFRESH_NAME, path='/')
            return response


class CsrfTokenView(APIView):
    """Simple view to ensure the CSRF cookie is set for browsers.

    Clients (SPA) can call this anonymous GET endpoint to obtain the
    CSRF cookie before performing unsafe requests (POST/PUT/PATCH/DELETE).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Calling get_token ensures the CSRF cookie is created on the response
        get_token(request)
        return Response({'detail': 'CSRF cookie set'})


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management."""

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Update current user profile."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password."""
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Wrong password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'status': 'password changed successfully'})

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def import_csv(self, request):
        """
        Bulk import users from CSV file.
        Expected CSV format: email,display_name,first_name,last_name,student_id,role
        """
        if request.user.role not in ['SUPERADMIN', 'TEACHER']:
            return Response(
                {'error': 'Only teachers and admins can import users'},
                status=status.HTTP_403_FORBIDDEN
            )

        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be CSV format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Read CSV file
            decoded_file = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))

            created_users = []
            updated_users = []
            errors = []

            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    email = row.get('email', '').strip()
                    if not email:
                        errors.append(f"Row {row_num}: Email is required")
                        continue

                    # Check if user exists
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'display_name': row.get('display_name', '').strip(),
                            'first_name': row.get('first_name', '').strip(),
                            'last_name': row.get('last_name', '').strip(),
                            'student_id': row.get('student_id', '').strip() or None,
                            'role': row.get('role', 'STUDENT').strip().upper(),
                        }
                    )

                    if created:
                        # Set default password for new users
                        default_password = row.get('password', 'ChangeMe123!')
                        user.set_password(default_password)
                        user.save()

                        # Create profile
                        UserProfile.objects.get_or_create(user=user)

                        created_users.append(email)
                    else:
                        # Update existing user
                        if row.get('display_name'):
                            user.display_name = row.get('display_name').strip()
                        if row.get('first_name'):
                            user.first_name = row.get('first_name').strip()
                        if row.get('last_name'):
                            user.last_name = row.get('last_name').strip()
                        if row.get('student_id'):
                            user.student_id = row.get('student_id').strip()
                        user.save()
                        updated_users.append(email)

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                'status': 'completed',
                'created': len(created_users),
                'updated': len(updated_users),
                'errors': len(errors),
                'created_users': created_users,
                'updated_users': updated_users,
                'error_details': errors
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to process CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
