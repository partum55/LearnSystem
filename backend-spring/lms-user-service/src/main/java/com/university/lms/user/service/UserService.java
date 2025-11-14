package com.university.lms.user.service;

import com.university.lms.common.domain.UserRole;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.*;
import com.university.lms.user.repository.UserRepository;
import com.university.lms.user.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service layer for user management operations.
 * Implements business logic matching Django's UserManager.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    /**
     * Register a new user.
     */
    @Transactional
    public UserDto registerUser(RegisterRequest request) {
        log.info("Registering new user with email: {}", request.getEmail());

        // Validate email uniqueness
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ValidationException("email", "Email already exists");
        }

        // Validate student ID uniqueness if provided
        if (request.getStudentId() != null && !request.getStudentId().isBlank()) {
            if (userRepository.existsByStudentId(request.getStudentId())) {
                throw new ValidationException("studentId", "Student ID already exists");
            }
        }

        // Create user entity
        User user = User.builder()
                .email(request.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .studentId(request.getStudentId())
                .role(request.getRole())
                .locale(request.getLocale())
                .isActive(true)
                .emailVerified(false)
                .emailVerificationToken(generateVerificationToken())
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully with ID: {}", user.getId());

        // TODO: Send verification email asynchronously

        return userMapper.toDto(user);
    }

    /**
     * Authenticate user and generate tokens.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new ValidationException("Invalid email or password"));

        if (!user.isActive()) {
            throw new ValidationException("Account is inactive");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed login attempt for email: {}", request.getEmail());
            throw new ValidationException("Invalid email or password");
        }

        // Generate tokens
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("User logged in successfully: {}", user.getId());

        return AuthResponse.of(
                accessToken,
                refreshToken,
                jwtService.getExpirationTime(),
                userMapper.toDto(user)
        );
    }

    /**
     * Get user by ID.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#id")
    public UserDto getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id.toString()));
        return userMapper.toDto(user);
    }

    /**
     * Get user by email.
     */
    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        return userMapper.toDto(user);
    }

    /**
     * Update user profile.
     */
    @Transactional
    @CacheEvict(value = "users", key = "#id")
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        log.info("Updating user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id.toString()));

        // Update fields if provided
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getLocale() != null) {
            user.setLocale(request.getLocale());
        }
        if (request.getTheme() != null) {
            user.setTheme(request.getTheme());
        }
        if (request.getPreferences() != null) {
            user.setPreferences(request.getPreferences());
        }

        user = userRepository.save(user);
        log.info("User updated successfully: {}", id);

        return userMapper.toDto(user);
    }

    /**
     * Change user password.
     */
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        log.info("Changing password for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ValidationException("currentPassword", "Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Password changed successfully for user: {}", userId);
    }

    /**
     * Request password reset.
     */
    @Transactional
    public void requestPasswordReset(String email) {
        log.info("Password reset requested for email: {}", email);

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));

        String resetToken = generateResetToken();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetExpires(LocalDateTime.now().plusHours(24));

        userRepository.save(user);

        // TODO: Send password reset email asynchronously

        log.info("Password reset token generated for user: {}", user.getId());
    }

    /**
     * Reset password with token.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Resetting password with token");

        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new ValidationException("Invalid or expired reset token"));

        if (!user.isPasswordResetTokenValid()) {
            throw new ValidationException("Password reset token has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);

        userRepository.save(user);

        log.info("Password reset successfully for user: {}", user.getId());
    }

    /**
     * Verify email with token.
     */
    @Transactional
    public void verifyEmail(String token) {
        log.info("Verifying email with token");

        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new ValidationException("Invalid verification token"));

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);

        userRepository.save(user);

        log.info("Email verified for user: {}", user.getId());
    }

    /**
     * Search users with pagination.
     */
    @Transactional(readOnly = true)
    public PageResponse<UserDto> searchUsers(String query, Pageable pageable) {
        Page<User> userPage = query != null && !query.isBlank()
                ? userRepository.searchUsers(query, pageable)
                : userRepository.findAll(pageable);

        return PageResponse.of(
                userPage.getContent().stream().map(userMapper::toDto).toList(),
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements()
        );
    }

    /**
     * Get users by role.
     */
    @Transactional(readOnly = true)
    public PageResponse<UserDto> getUsersByRole(UserRole role, Pageable pageable) {
        Page<User> userPage = userRepository.findByRole(role, pageable);

        return PageResponse.of(
                userPage.getContent().stream().map(userMapper::toDto).toList(),
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements()
        );
    }

    /**
     * Deactivate user account.
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public void deactivateUser(UUID userId) {
        log.info("Deactivating user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        user.setActive(false);
        userRepository.save(user);

        log.info("User deactivated: {}", userId);
    }

    /**
     * Activate user account.
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public void activateUser(UUID userId) {
        log.info("Activating user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        user.setActive(true);
        userRepository.save(user);

        log.info("User activated: {}", userId);
    }

    /**
     * Delete user account (soft delete).
     */
    @Transactional
    @CacheEvict(value = "users", key = "#userId")
    public void deleteUser(UUID userId) {
        log.info("Deleting user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        // Soft delete by deactivating
        user.setActive(false);
        userRepository.save(user);

        log.info("User deleted (soft): {}", userId);
    }

    // Helper methods

    private String generateVerificationToken() {
        return UUID.randomUUID().toString();
    }

    private String generateResetToken() {
        return UUID.randomUUID().toString();
    }
}

