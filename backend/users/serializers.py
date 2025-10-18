from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    
    class Meta:
        model = UserProfile
        fields = [
            'phone_number', 'date_of_birth', 'address',
            'department', 'position', 'notification_preferences'
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user model."""
    
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'display_name', 'first_name', 'last_name',
            'student_id', 'role', 'locale', 'theme', 'avatar', 'bio',
            'is_active', 'email_verified', 'created_at', 'updated_at',
            'profile', 'full_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'email_verified']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""
    
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'display_name',
            'first_name', 'last_name', 'student_id', 'role'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create profile
        UserProfile.objects.create(user=user)
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    
    class Meta:
        model = User
        fields = [
            'display_name', 'first_name', 'last_name',
            'locale', 'theme', 'avatar', 'bio'
        ]


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

