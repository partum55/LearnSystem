"""
Security headers middleware for enhanced protection
"""
import secrets


class SecurityHeadersMiddleware:
    """
    Add security headers to all responses
    
    Headers:
    - Content-Security-Policy (CSP)
    - X-Content-Type-Options
    - X-Frame-Options
    - X-XSS-Protection
    - Strict-Transport-Security
    - Referrer-Policy
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Generate nonce for CSP
        nonce = secrets.token_urlsafe(16)
        request.csp_nonce = nonce
        
        response = self.get_response(request)
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            f"script-src 'self' 'nonce-{nonce}' 'strict-dynamic'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "media-src 'self' https:",
            "connect-src 'self' https://api.render.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ]
        response['Content-Security-Policy'] = '; '.join(csp_directives)
        
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # XSS Protection (legacy browsers)
        response['X-XSS-Protection'] = '1; mode=block'
        
        # HSTS (force HTTPS)
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy (formerly Feature-Policy)
        permissions = [
            "geolocation=()",
            "microphone=()",
            "camera=()",
            "payment=()",
            "usb=()",
        ]
        response['Permissions-Policy'] = ', '.join(permissions)
        
        return response


class CORSSecurityMiddleware:
    """
    Enhanced CORS security with credential handling
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Only allow credentials for same-origin or explicitly allowed origins
        origin = request.META.get('HTTP_ORIGIN', '')
        
        if origin and self._is_allowed_origin(origin):
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Origin'] = origin
        
        return response
    
    def _is_allowed_origin(self, origin):
        """Check if origin is allowed"""
        from django.conf import settings
        allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        return origin in allowed

