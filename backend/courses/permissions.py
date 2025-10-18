from rest_framework import permissions


class IsAuthenticatedOrOptions(permissions.BasePermission):
    """
    Custom permission to allow OPTIONS requests without authentication
    for CORS preflight, but require authentication for all other methods.
    """

    def has_permission(self, request, view):
        # Allow OPTIONS requests without authentication
        if request.method == 'OPTIONS':
            return True
        
        # For all other methods, require authentication
        return request.user and request.user.is_authenticated


class IsCourseOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a course to edit it.
    Teachers and admins can create and edit courses.
    """

    def has_permission(self, request, view):
        # Allow OPTIONS without auth for CORS
        if request.method == 'OPTIONS':
            return True
            
        # Require authentication for all other methods
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read permissions for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow POST, PUT, PATCH, DELETE for TEACHER and SUPERADMIN
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return request.user.role in ['TEACHER', 'SUPERADMIN']

        # Default to allowing authenticated users
        return True
