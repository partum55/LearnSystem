"""
Custom exceptions and error handling
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
import uuid


class ErrorCode:
    """Standardized error codes"""
    # Authentication (4xx)
    AUTH_INVALID_CREDENTIALS = 'AUTH_001'
    AUTH_TOKEN_EXPIRED = 'AUTH_002'
    AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003'
    AUTH_ACCOUNT_DISABLED = 'AUTH_004'
    
    # Validation (4xx)
    VALIDATION_FAILED = 'VAL_001'
    RESOURCE_NOT_FOUND = 'VAL_002'
    DUPLICATE_ENTRY = 'VAL_003'
    INVALID_INPUT = 'VAL_004'
    
    # Business Logic (4xx)
    COURSE_FULL = 'BIZ_001'
    DEADLINE_PASSED = 'BIZ_002'
    QUIZ_ALREADY_STARTED = 'BIZ_003'
    ENROLLMENT_CLOSED = 'BIZ_004'
    INSUFFICIENT_ATTEMPTS = 'BIZ_005'
    
    # Server (5xx)
    INTERNAL_ERROR = 'SRV_001'
    DATABASE_ERROR = 'SRV_002'
    EXTERNAL_SERVICE_ERROR = 'SRV_003'
    FILE_STORAGE_ERROR = 'SRV_004'


class LMSException(Exception):
    """Base exception for LMS"""
    def __init__(self, message, code=ErrorCode.INTERNAL_ERROR, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, details=None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class AuthenticationException(LMSException):
    """Authentication related exceptions"""
    def __init__(self, message, code=ErrorCode.AUTH_INVALID_CREDENTIALS, details=None):
        super().__init__(message, code, status.HTTP_401_UNAUTHORIZED, details)


class ValidationException(LMSException):
    """Validation related exceptions"""
    def __init__(self, message, code=ErrorCode.VALIDATION_FAILED, details=None):
        super().__init__(message, code, status.HTTP_400_BAD_REQUEST, details)


class BusinessLogicException(LMSException):
    """Business logic exceptions"""
    def __init__(self, message, code=ErrorCode.INTERNAL_ERROR, details=None):
        super().__init__(message, code, status.HTTP_400_BAD_REQUEST, details)


class ResourceNotFoundException(LMSException):
    """Resource not found exception"""
    def __init__(self, message="Resource not found", details=None):
        super().__init__(message, ErrorCode.RESOURCE_NOT_FOUND, status.HTTP_404_NOT_FOUND, details)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standardized error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Generate unique request ID for tracking
    request_id = str(uuid.uuid4())
    
    # Handle LMS custom exceptions
    if isinstance(exc, LMSException):
        error_response = {
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
                'timestamp': timezone.now().isoformat(),
                'request_id': request_id
            }
        }
        return Response(error_response, status=exc.status_code)
    
    # Handle standard DRF exceptions
    if response is not None:
        error_response = {
            'error': {
                'code': ErrorCode.VALIDATION_FAILED,
                'message': 'Validation error',
                'details': response.data,
                'timestamp': timezone.now().isoformat(),
                'request_id': request_id
            }
        }
        return Response(error_response, status=response.status_code)
    
    # Handle unexpected exceptions
    error_response = {
        'error': {
            'code': ErrorCode.INTERNAL_ERROR,
            'message': 'An unexpected error occurred',
            'details': str(exc) if hasattr(exc, '__str__') else None,
            'timestamp': timezone.now().isoformat(),
            'request_id': request_id
        }
    }
    
    return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

