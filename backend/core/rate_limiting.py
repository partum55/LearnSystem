"""
Rate limiting middleware using Redis
"""
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework import status
import hashlib
import time


class RateLimitMiddleware:
    """
    Rate limiting middleware using Redis cache
    
    Limits:
    - API endpoints: 100 req/min/IP
    - Auth endpoints: 5 req/15min/IP
    - File uploads: 10 req/hour/user
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Rate limit configurations
        self.limits = {
            'api': {'requests': 100, 'window': 60},  # 100 req/min
            'auth': {'requests': 5, 'window': 900},  # 5 req/15min
            'upload': {'requests': 10, 'window': 3600},  # 10 req/hour
        }
    
    def __call__(self, request):
        # Skip rate limiting for superusers
        if request.user.is_authenticated and hasattr(request.user, 'role'):
            if request.user.role == 'SUPERADMIN':
                return self.get_response(request)
        
        # Determine rate limit type
        limit_type = self._get_limit_type(request)
        
        if limit_type:
            # Check rate limit
            is_allowed, retry_after = self._check_rate_limit(request, limit_type)
            
            if not is_allowed:
                return JsonResponse({
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': 'Too many requests. Please try again later.',
                        'retry_after': retry_after
                    }
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        response = self.get_response(request)
        
        # Add rate limit headers
        if limit_type:
            limit_config = self.limits[limit_type]
            key = self._get_cache_key(request, limit_type)
            current_count = cache.get(key, 0)
            
            response['X-RateLimit-Limit'] = limit_config['requests']
            response['X-RateLimit-Remaining'] = max(0, limit_config['requests'] - current_count)
            response['X-RateLimit-Reset'] = int(time.time()) + limit_config['window']
        
        return response
    
    def _get_limit_type(self, request):
        """Determine which rate limit to apply"""
        path = request.path
        
        # Auth endpoints
        if any(x in path for x in ['/api/auth/', '/api/token/', '/api/users/login/']):
            return 'auth'
        
        # Upload endpoints
        if request.method in ['POST', 'PUT', 'PATCH'] and request.FILES:
            return 'upload'
        
        # All API endpoints
        if path.startswith('/api/'):
            return 'api'
        
        return None
    
    def _check_rate_limit(self, request, limit_type):
        """Check if request exceeds rate limit"""
        limit_config = self.limits[limit_type]
        key = self._get_cache_key(request, limit_type)
        timestamp_key = f"{key}:timestamp"

        # Get current count and timestamp
        current_count = cache.get(key, 0)
        timestamp = cache.get(timestamp_key)

        if current_count >= limit_config['requests']:
            # Calculate retry after time based on a stored timestamp
            if timestamp:
                retry_after = max(0, int(timestamp + limit_config['window'] - time.time()))
            else:
                retry_after = limit_config['window']
            return False, retry_after

        # Increment counter
        if current_count == 0:
            # Store both counter and timestamp
            current_time = time.time()
            cache.set(key, 1, limit_config['window'])
            cache.set(timestamp_key, current_time, limit_config['window'])
        else:
            cache.incr(key)
        
        return True, 0
    
    def _get_cache_key(self, request, limit_type):
        """Generate cache key for rate limiting"""
        # Use IP address for anonymous users
        if not request.user.is_authenticated:
            identifier = self._get_client_ip(request)
        else:
            # Use user ID for authenticated users
            identifier = str(request.user.id)
        
        # Hash the identifier for privacy
        hashed = hashlib.sha256(identifier.encode()).hexdigest()[:16]
        
        return f'ratelimit:{limit_type}:{hashed}'
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LoginAttemptTracker:
    """
    Track failed login attempts and implement CAPTCHA requirement
    """
    
    @staticmethod
    def record_failed_attempt(identifier):
        """Record a failed login attempt"""
        key = f'login_attempts:{identifier}'
        attempts = cache.get(key, 0)
        cache.set(key, attempts + 1, 900)  # 15 minutes
        return attempts + 1
    
    @staticmethod
    def record_successful_attempt(identifier):
        """Clear failed attempts on successful login"""
        key = f'login_attempts:{identifier}'
        cache.delete(key)
    
    @staticmethod
    def get_attempts(identifier):
        """Get number of failed attempts"""
        key = f'login_attempts:{identifier}'
        return cache.get(key, 0)
    
    @staticmethod
    def requires_captcha(identifier):
        """Check if CAPTCHA is required (after 3 failed attempts)"""
        return LoginAttemptTracker.get_attempts(identifier) >= 3
    
    @staticmethod
    def is_locked(identifier):
        """Check if account is locked (after 5 failed attempts)"""
        return LoginAttemptTracker.get_attempts(identifier) >= 5

