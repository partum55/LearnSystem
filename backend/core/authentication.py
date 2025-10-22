from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate a request by reading the JWT from the 'access_token' cookie.
    Falls back to header-based auth if cookie is not present.
    """

    def authenticate(self, request):
        # Try cookie first
        raw_token = request.COOKIES.get('access_token')
        if raw_token:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        # Fallback to default behavior (Authorization header)
        return super().authenticate(request)
