import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPERADMIN')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model with UUID primary key and role-based access."""

    ROLE_CHOICES = [
        ('SUPERADMIN', 'Super Administrator'),
        ('TEACHER', 'Teacher'),
        ('STUDENT', 'Student'),
        ('TA', 'Teaching Assistant'),
    ]

    LOCALE_CHOICES = [
        ('uk', 'Ukrainian'),
        ('en', 'English'),
    ]

    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True, db_index=True)
    display_name = models.CharField(_('display name'), max_length=150, blank=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    student_id = models.CharField(_('student ID'), max_length=50, blank=True, null=True, unique=True)

    role = models.CharField(_('role'), max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    locale = models.CharField(_('locale'), max_length=5, choices=LOCALE_CHOICES, default='uk')
    theme = models.CharField(_('theme'), max_length=10, choices=THEME_CHOICES, default='light')

    avatar = models.ImageField(_('avatar'), upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(_('bio'), blank=True)

    is_active = models.BooleanField(_('active'), default=True)
    is_staff = models.BooleanField(_('staff status'), default=False)

    email_verified = models.BooleanField(_('email verified'), default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    last_login_at = models.DateTimeField(_('last login'), null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['display_name']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['student_id']),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'
        return full_name.strip() or self.display_name or self.email

    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.display_name or self.email.split('@')[0]


class UserProfile(models.Model):
    """Extended user profile with additional information."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(_('phone number'), max_length=20, blank=True)
    date_of_birth = models.DateField(_('date of birth'), null=True, blank=True)
    address = models.TextField(_('address'), blank=True)
    department = models.CharField(_('department'), max_length=200, blank=True)
    position = models.CharField(_('position'), max_length=200, blank=True)

    notification_preferences = models.JSONField(_('notification preferences'), default=dict, blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('user profile')
        verbose_name_plural = _('user profiles')

    def __str__(self):
        return f'Profile of {self.user.email}'
