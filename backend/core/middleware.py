"""Middleware for audit logging and security."""
import logging
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog

logger = logging.getLogger(__name__)


class AuditLoggingMiddleware(MiddlewareMixin):
    """Middleware to log important actions for audit purposes."""

    # Actions that should be logged
    LOGGED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

    # Paths to exclude from logging (to avoid noise)
    EXCLUDED_PATHS = [
        '/api/schema/',
        '/admin/jsi18n/',
        '/static/',
        '/media/',
    ]

    def process_response(self, request, response):
        """Log the request if it's a mutating operation and successful."""

        # Check if we should log this request
        if not self._should_log(request, response):
            return response

        try:
            # Get user IP address
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            # Extract resource information from the path
            resource_info = self._extract_resource_info(request)

            # Create audit log entry
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action=f"{request.method}_{resource_info['action']}",
                resource_type=resource_info['type'],
                resource_id=resource_info['id'] or '00000000-0000-0000-0000-000000000000',
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            # Don't break the request if logging fails
            logger.error(f"Failed to create audit log: {e}")

        return response

    def _should_log(self, request, response):
        """Determine if this request should be logged."""

        # Only log successful mutating operations
        if request.method not in self.LOGGED_METHODS:
            return False

        # Don't log failed requests (might be spam/attacks)
        if response.status_code >= 400:
            return False

        # Skip excluded paths
        for excluded in self.EXCLUDED_PATHS:
            if request.path.startswith(excluded):
                return False

        return True

    def _get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _extract_resource_info(self, request):
        """Extract resource type and ID from request path."""
        path_parts = request.path.strip('/').split('/')

        # Default values
        info = {
            'type': 'unknown',
            'action': 'modify',
            'id': None
        }

        # Try to extract from API paths like /api/courses/123/
        if len(path_parts) >= 2:
            if path_parts[0] == 'api':
                if len(path_parts) >= 2:
                    info['type'] = path_parts[1]  # e.g., 'courses'
                if len(path_parts) >= 3:
                    try:
                        # Try to parse UUID or ID
                        info['id'] = path_parts[2]
                    except (ValueError, IndexError):
                        pass

        # Determine action based on HTTP method
        action_map = {
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete',
        }
        info['action'] = action_map.get(request.method, 'modify')

        return info


class RateLimitMiddleware(MiddlewareMixin):
    """Simple rate limiting middleware (placeholder for production rate limiter)."""

    # This is a simple implementation. In production, use django-ratelimit or similar

    def process_request(self, request):
        """Check rate limits for the request."""
        # TODO: Implement actual rate limiting logic
        # For now, this is just a placeholder
        # In production, integrate with Redis/Memcached for distributed rate limiting
        return None
