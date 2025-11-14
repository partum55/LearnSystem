"""RBAC (Role-Based Access Control) permissions matrix."""
from rest_framework import permissions


class RBACPermission(permissions.BasePermission):
    """
    Permission class based on RBAC matrix from IMPROVEMENTS.md

    Permission matrix:
    | Action                       | SuperAdmin | Teacher | TA    | Student |
    |------------------------------|-----------|---------|-------|---------|
    | Create/delete course         | ✓         | ✓       | ✗     | ✗       |
    | Edit course                  | ✓         | ✓ (own) | ✗     | ✗       |
    | Add/remove students          | ✓         | ✓       | ✓*    | ✗       |
    | Create test/assignment       | ✓         | ✓       | ✗     | ✗       |
    | Grade submissions            | ✓         | ✓       | ✓     | ✗       |
    | View all grades              | ✓         | ✓       | ✓**   | ✗       |
    | Export data                  | ✓         | ✓       | ✗     | ✗       |
    | Delete users                 | ✓         | ✗       | ✗     | ✗       |
    | System settings              | ✓         | ✗       | ✗     | ✗       |

    * TA can add but not remove students
    ** TA sees only assigned groups
    """

    # Actions mapping
    ACTION_CREATE_COURSE = 'create_course'
    ACTION_EDIT_COURSE = 'edit_course'
    ACTION_DELETE_COURSE = 'delete_course'
    ACTION_ADD_STUDENTS = 'add_students'
    ACTION_REMOVE_STUDENTS = 'remove_students'
    ACTION_CREATE_ASSIGNMENT = 'create_assignment'
    ACTION_GRADE_SUBMISSION = 'grade_submission'
    ACTION_VIEW_ALL_GRADES = 'view_all_grades'
    ACTION_EXPORT_DATA = 'export_data'
    ACTION_DELETE_USER = 'delete_user'
    ACTION_SYSTEM_SETTINGS = 'system_settings'

    # Permission matrix
    PERMISSIONS = {
        'SUPERADMIN': {
            ACTION_CREATE_COURSE: True,
            ACTION_EDIT_COURSE: True,
            ACTION_DELETE_COURSE: True,
            ACTION_ADD_STUDENTS: True,
            ACTION_REMOVE_STUDENTS: True,
            ACTION_CREATE_ASSIGNMENT: True,
            ACTION_GRADE_SUBMISSION: True,
            ACTION_VIEW_ALL_GRADES: True,
            ACTION_EXPORT_DATA: True,
            ACTION_DELETE_USER: True,
            ACTION_SYSTEM_SETTINGS: True,
        },
        'TEACHER': {
            ACTION_CREATE_COURSE: True,
            ACTION_EDIT_COURSE: 'own',  # Only own courses
            ACTION_DELETE_COURSE: 'own',  # Only own courses
            ACTION_ADD_STUDENTS: True,
            ACTION_REMOVE_STUDENTS: True,
            ACTION_CREATE_ASSIGNMENT: True,
            ACTION_GRADE_SUBMISSION: True,
            ACTION_VIEW_ALL_GRADES: True,
            ACTION_EXPORT_DATA: True,
            ACTION_DELETE_USER: False,
            ACTION_SYSTEM_SETTINGS: False,
        },
        'TA': {
            ACTION_CREATE_COURSE: False,
            ACTION_EDIT_COURSE: False,
            ACTION_DELETE_COURSE: False,
            ACTION_ADD_STUDENTS: True,  # Can add
            ACTION_REMOVE_STUDENTS: False,  # Cannot remove
            ACTION_CREATE_ASSIGNMENT: False,
            ACTION_GRADE_SUBMISSION: True,
            ACTION_VIEW_ALL_GRADES: 'assigned',  # Only assigned groups
            ACTION_EXPORT_DATA: False,
            ACTION_DELETE_USER: False,
            ACTION_SYSTEM_SETTINGS: False,
        },
        'STUDENT': {
            ACTION_CREATE_COURSE: False,
            ACTION_EDIT_COURSE: False,
            ACTION_DELETE_COURSE: False,
            ACTION_ADD_STUDENTS: False,
            ACTION_REMOVE_STUDENTS: False,
            ACTION_CREATE_ASSIGNMENT: False,
            ACTION_GRADE_SUBMISSION: False,
            ACTION_VIEW_ALL_GRADES: False,
            ACTION_EXPORT_DATA: False,
            ACTION_DELETE_USER: False,
            ACTION_SYSTEM_SETTINGS: False,
        },
    }

    def has_permission(self, request, view):
        """Check if user has permission for the action."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Get the action from view
        action = getattr(view, 'rbac_action', None)
        if not action:
            # If no specific action is set, allow authenticated users
            return True

        return self.check_permission(request.user, action)

    def has_object_permission(self, request, view, obj):
        """Check if user has permission for specific object."""
        if not request.user or not request.user.is_authenticated:
            return False

        action = getattr(view, 'rbac_action', None)
        if not action:
            return True

        # Check basic permission first
        has_perm = self.check_permission(request.user, action, obj)

        # For 'own' permissions, check ownership
        if has_perm == 'own':
            return self._check_ownership(request.user, obj)

        return has_perm

    @classmethod
    def check_permission(cls, user, action, obj=None):
        """Check if user role has permission for action."""
        role = getattr(user, 'role', 'STUDENT')

        if role not in cls.PERMISSIONS:
            return False

        permission = cls.PERMISSIONS[role].get(action, False)

        # Handle conditional permissions
        if permission == 'own' and obj:
            return cls._check_ownership(user, obj)
        elif permission == 'assigned' and obj:
            return cls._check_assignment(user, obj)

        return permission

    @staticmethod
    def _check_ownership(user, obj):
        """Check if user owns the object."""
        # Check various ownership fields
        owner_fields = ['owner', 'owner_id', 'created_by', 'created_by_id', 'user', 'user_id']

        for field in owner_fields:
            if hasattr(obj, field):
                owner = getattr(obj, field)
                # Handle both direct object and ID comparisons
                if owner == user or owner == user.id:
                    return True

        return False

    @staticmethod
    def _check_assignment(user, obj):
        """Check if user is assigned to the object (for TAs)."""
        # This would check if TA is assigned to specific groups/sections
        # Implementation depends on how you track TA assignments
        # For now, return True if user is a TA in the course
        if hasattr(obj, 'course'):
            from courses.models import CourseMember
            return CourseMember.objects.filter(
                course=obj.course,
                user=user,
                role_in_course='TA'
            ).exists()
        return False


class IsCourseTeacherOrTA(permissions.BasePermission):
    """Permission to check if user is teacher or TA of the course."""

    def has_object_permission(self, request, view, obj):
        from courses.models import CourseMember

        # Get course from object
        course = getattr(obj, 'course', obj)

        return CourseMember.objects.filter(
            course=course,
            user=request.user,
            role_in_course__in=['TEACHER', 'TA']
        ).exists()


class IsCourseMember(permissions.BasePermission):
    """Permission to check if user is a member of the course."""

    def has_object_permission(self, request, view, obj):
        from courses.models import CourseMember

        # Get course from object
        course = getattr(obj, 'course', obj)

        return CourseMember.objects.filter(
            course=course,
            user=request.user
        ).exists()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Object-level permission to only allow owners to edit."""

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        return RBACPermission._check_ownership(request.user, obj)
