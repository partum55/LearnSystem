"""
File storage utilities and validation
"""
import os
import uuid
from datetime import datetime
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError


class FileLimits:
    """File upload limits configuration"""
    PDF = {
        'max_size': 50 * 1024 * 1024,  # 50MB
        'mime_types': ['application/pdf'],
        'extensions': ['.pdf']
    }
    VIDEO = {
        'max_size': 500 * 1024 * 1024,  # 500MB
        'mime_types': ['video/mp4', 'video/webm'],
        'extensions': ['.mp4', '.webm']
    }
    IMAGE = {
        'max_size': 10 * 1024 * 1024,  # 10MB
        'mime_types': ['image/jpeg', 'image/png', 'image/webp'],
        'extensions': ['.jpg', '.jpeg', '.png', '.webp']
    }
    DOCUMENT = {
        'max_size': 25 * 1024 * 1024,  # 25MB
        'mime_types': [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ],
        'extensions': ['.docx', '.doc']
    }
    PRESENTATION = {
        'max_size': 50 * 1024 * 1024,  # 50MB
        'mime_types': [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint'
        ],
        'extensions': ['.pptx', '.ppt']
    }


def validate_file_upload(file, file_type='general'):
    """
    Validate uploaded file based on type
    
    Args:
        file: UploadedFile instance
        file_type: Type of file (pdf, video, image, document, presentation)
    
    Raises:
        ValidationError: If file doesn't meet requirements
    """
    if not file:
        raise ValidationError("No file provided")
    
    # Get file limits for type
    limits = getattr(FileLimits, file_type.upper(), None)
    if not limits:
        # General limits for unknown types
        limits = {
            'max_size': 25 * 1024 * 1024,
            'mime_types': [],
            'extensions': []
        }
    
    # Check file size
    if file.size > limits['max_size']:
        max_mb = limits['max_size'] / (1024 * 1024)
        raise ValidationError(f"File size exceeds {max_mb}MB limit")
    
    # Check extension
    file_ext = os.path.splitext(file.name)[1].lower()
    if limits['extensions'] and file_ext not in limits['extensions']:
        raise ValidationError(
            f"Invalid file extension. Allowed: {', '.join(limits['extensions'])}"
        )
    
    # Check MIME type
    if limits['mime_types'] and file.content_type not in limits['mime_types']:
        raise ValidationError(
            f"Invalid file type. Allowed: {', '.join(limits['mime_types'])}"
        )
    
    return True


def generate_file_path(file, resource_type, resource_id, user_id=None):
    """
    Generate organized file path
    
    Structure:
    - /courses/{course_id}/resources/{year}/{month}/{uuid}.{ext}
    - /submissions/{assignment_id}/{user_id}/{uuid}.{ext}
    - /profile-images/{user_id}/{uuid}.{ext}
    
    Args:
        file: UploadedFile instance
        resource_type: Type of resource (course, submission, profile)
        resource_id: ID of the resource
        user_id: Optional user ID
    
    Returns:
        str: File path
    """
    now = datetime.now()
    file_ext = os.path.splitext(file.name)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    if resource_type == 'course':
        path = f"courses/{resource_id}/resources/{now.year}/{now.month:02d}/{unique_filename}"
    elif resource_type == 'submission':
        path = f"submissions/{resource_id}/{user_id}/{unique_filename}"
    elif resource_type == 'profile':
        path = f"profile-images/{user_id}/{unique_filename}"
    elif resource_type == 'temp':
        path = f"temp/{resource_id}/{unique_filename}"
    else:
        path = f"uploads/{resource_type}/{resource_id}/{unique_filename}"
    
    return path


def save_uploaded_file(file, resource_type, resource_id, user_id=None, file_type='general'):
    """
    Validate and save uploaded file
    
    Args:
        file: UploadedFile instance
        resource_type: Type of resource
        resource_id: ID of the resource
        user_id: Optional user ID
        file_type: Type for validation
    
    Returns:
        str: Saved file path
    
    Raises:
        ValidationError: If validation fails
    """
    # Validate file
    validate_file_upload(file, file_type)
    
    # Generate path
    file_path = generate_file_path(file, resource_type, resource_id, user_id)
    
    # Save file
    saved_path = default_storage.save(file_path, file)
    
    return saved_path


def delete_file(file_path):
    """
    Delete file from storage (soft delete)
    
    Args:
        file_path: Path to file
    
    Returns:
        bool: Success status
    """
    try:
        if default_storage.exists(file_path):
            default_storage.delete(file_path)
            return True
        return False
    except Exception as e:
        # Log error
        print(f"Error deleting file {file_path}: {e}")
        return False


def get_file_url(file_path, expiry=3600):
    """
    Get URL for file (signed URL for private files)
    
    Args:
        file_path: Path to file
        expiry: URL expiry time in seconds (default 1 hour)
    
    Returns:
        str: File URL
    """
    if default_storage.exists(file_path):
        return default_storage.url(file_path)
    return None

