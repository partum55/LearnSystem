package com.university.lms.user.service;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.user.client.CourseClient;
import com.university.lms.user.domain.User;
import com.university.lms.user.dto.AuthResponse;
import com.university.lms.user.dto.ChangePasswordRequest;
import com.university.lms.user.dto.LoginRequest;
import com.university.lms.user.dto.RegisterRequest;
import com.university.lms.user.dto.ResetPasswordRequest;
import com.university.lms.user.dto.UpdateUserRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private static final Duration PASSWORD_RESET_TOKEN_TTL = Duration.ofHours(24);
    private static final Set<String> ALLOWED_THEMES = Set.of("light", "dark");
    private static final String USERS_CACHE = "users";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final EmailService emailService;
    private final JwtTokenBlacklistService tokenBlacklistService;
    private final CourseClient courseClient;
    private final CacheManager cacheManager;

    @Transactional
    public UserDto registerUser(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        String studentId = normalizeOptional(request.getStudentId());

        validateRegistration(email, studentId, request.getRole());

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(normalizeOptional(request.getDisplayName()))
                .firstName(normalizeOptional(request.getFirstName()))
                .lastName(normalizeOptional(request.getLastName()))
                .studentId(studentId)
                .role(resolveRegistrationRole())
                .locale(request.getLocale() != null ? request.getLocale() : UserLocale.UK)
                .isActive(true)
                .emailVerified(false)
                .emailVerificationToken(generateToken())
                .build();

        User savedUser = userRepository.save(user);
        emailService.sendVerificationEmail(savedUser);

        log.info("User registered successfully: {}", savedUser.getId());
        return userMapper.toDto(savedUser);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmailIgnoreCaseAndIsDeletedFalse(email)
                .orElseThrow(this::invalidCredentialsException);

        ensureUserIsActive(user);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed login attempt for email: {}", email);
            throw invalidCredentialsException();
        }

        log.info("User logged in: {}", user.getId());
        return buildAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ValidationException("Refresh token is required");
        }
        if (!jwtService.validateRefreshToken(refreshToken)) {
            throw new ValidationException("Invalid or expired refresh token");
        }

        UUID userId;
        try {
            userId = jwtService.extractUserId(refreshToken);
        } catch (Exception ex) {
            throw new ValidationException("Invalid or expired refresh token");
        }
        User user = getRequiredUserById(userId);
        ensureUserIsActive(user);

        log.info("Tokens refreshed for user: {}", userId);
        return buildAuthResponse(user);
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) {
            log.debug("Logout called without token");
            return;
        }

        try {
            if (jwtService.validateToken(token)) {
                tokenBlacklistService.blacklistToken(token);
                log.info("Token blacklisted on logout");
            } else {
                log.debug("Skipping logout blacklisting for invalid token");
            }
        } catch (Exception ex) {
            log.warn("Failed to blacklist token during logout: {}", ex.getMessage());
        }
    }

    @Transactional
    public UserDto adminCreateUser(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        String studentId = normalizeOptional(request.getStudentId());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ValidationException("email", "Email already exists");
        }
        if (studentId != null && userRepository.existsByStudentId(studentId)) {
            throw new ValidationException("studentId", "Student ID already exists");
        }

        UserRole role = request.getRole() != null ? request.getRole() : UserRole.STUDENT;

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(normalizeOptional(request.getDisplayName()))
                .firstName(normalizeOptional(request.getFirstName()))
                .lastName(normalizeOptional(request.getLastName()))
                .studentId(studentId)
                .role(role)
                .locale(request.getLocale() != null ? request.getLocale() : UserLocale.UK)
                .isActive(true)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Admin created user {} with role {}", savedUser.getId(), role);
        return userMapper.toDto(savedUser);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = USERS_CACHE, key = "#id")
    public UserDto getUserById(UUID id) {
        return userMapper.toDto(getRequiredUserById(id));
    }

    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        User user = userRepository.findByEmailIgnoreCaseAndIsDeletedFalse(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", normalizedEmail));
        return userMapper.toDto(user);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#id")
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        User user = getRequiredUserById(id);

        UpdateUserRequest normalizedRequest = normalizeUpdateRequest(request);
        userMapper.updateUserFromRequest(normalizedRequest, user);

        if (normalizedRequest.getPreferences() != null) {
            user.setPreferences(new HashMap<>(normalizedRequest.getPreferences()));
        }

        User updatedUser = userRepository.save(user);
        log.info("User updated: {}", id);

        return userMapper.toDto(updatedUser);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = getRequiredUserById(userId);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ValidationException("currentPassword", "Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        tokenBlacklistService.blacklistUserTokens(userId.toString());

        log.info("Password changed for user: {}", userId);
    }

    @Transactional
    public void requestPasswordReset(String email) {
        String normalizedEmail = normalizeEmail(email);
        User user = userRepository.findByEmailIgnoreCaseAndIsDeletedFalse(normalizedEmail).orElse(null);
        if (user == null) {
            log.info("Password reset requested for unknown email");
            return;
        }

        user.setPasswordResetToken(generateToken());
        user.setPasswordResetExpires(LocalDateTime.now().plus(PASSWORD_RESET_TOKEN_TTL));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user);
        log.info("Password reset token generated for user: {}", user.getId());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String token = normalizeOptional(request.getToken());
        if (token == null) {
            throw new ValidationException("token", "Reset token is required");
        }

        User user = userRepository.findByPasswordResetTokenAndIsDeletedFalse(token)
                .orElseThrow(() -> new ValidationException("Invalid or expired reset token"));

        if (!user.isPasswordResetTokenValid()) {
            throw new ValidationException("Password reset token has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);
        userRepository.save(user);

        tokenBlacklistService.blacklistUserTokens(user.getId().toString());
        evictUserCache(user.getId());
        log.info("Password reset successfully for user: {}", user.getId());
    }

    @Transactional
    public void verifyEmail(String token) {
        String normalizedToken = normalizeOptional(token);
        if (normalizedToken == null) {
            throw new ValidationException("token", "Verification token is required");
        }

        User user = userRepository.findByEmailVerificationTokenAndIsDeletedFalse(normalizedToken)
                .orElseThrow(() -> new ValidationException("Invalid verification token"));

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        userRepository.save(user);

        emailService.sendWelcomeEmail(user);
        evictUserCache(user.getId());
        log.info("Email verified for user: {}", user.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> searchUsers(String query, Pageable pageable) {
        String normalizedQuery = normalizeOptional(query);
        Page<User> userPage = normalizedQuery == null
                ? userRepository.findByIsDeletedFalse(pageable)
                : userRepository.searchUsers(normalizedQuery, pageable);

        return PageResponse.of(
                userPage.getContent().stream().map(userMapper::toDto).toList(),
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> getUsersByRole(UserRole role, Pageable pageable) {
        if (role == null) {
            throw new ValidationException("role", "Role is required");
        }

        Page<User> userPage = userRepository.findByRoleAndIsDeletedFalse(role, pageable);
        return PageResponse.of(
                userPage.getContent().stream().map(userMapper::toDto).toList(),
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements()
        );
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void deactivateUser(UUID userId) {
        User user = getRequiredUserById(userId);
        user.setActive(false);
        userRepository.save(user);
        log.info("User deactivated: {}", userId);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void activateUser(UUID userId) {
        User user = getRequiredUserById(userId);
        user.setActive(true);
        userRepository.save(user);
        log.info("User activated: {}", userId);
    }

    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#userId")
    public void deleteUser(UUID userId) {
        User user = getRequiredUserById(userId);

        try {
            courseClient.deleteUserData(userId);
        } catch (Exception ex) {
            log.error("Failed to cleanup course data for user {}: {}", userId, ex.getMessage());
            throw new RuntimeException("Failed to cleanup user data in course service", ex);
        }

        userRepository.delete(user);
        log.info("User deleted: {}", userId);
    }

    private void validateRegistration(String email, String studentId, UserRole requestedRole) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ValidationException("email", "Email already exists");
        }

        if (studentId != null && userRepository.existsByStudentId(studentId)) {
            throw new ValidationException("studentId", "Student ID already exists");
        }

        if (requestedRole != null && requestedRole != UserRole.STUDENT) {
            throw new ValidationException("role", "Self-registration supports only STUDENT role");
        }
    }

    private UserRole resolveRegistrationRole() {
        return UserRole.STUDENT;
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateToken(buildJwtClaims(user), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(buildJwtClaims(user), user.getEmail());

        return AuthResponse.of(
                accessToken,
                refreshToken,
                jwtService.getExpirationTime(),
                userMapper.toDto(user)
        );
    }

    private Map<String, Object> buildJwtClaims(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("role", user.getRole() != null ? user.getRole().name() : null);
        return claims;
    }

    private void ensureUserIsActive(User user) {
        if (!user.isActive()) {
            throw new ValidationException("Account is inactive");
        }
    }

    private ValidationException invalidCredentialsException() {
        return new ValidationException("Invalid email or password");
    }

    private User getRequiredUserById(UUID userId) {
        return userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
    }

    private UpdateUserRequest normalizeUpdateRequest(UpdateUserRequest request) {
        return UpdateUserRequest.builder()
                .displayName(normalizeOptional(request.getDisplayName()))
                .firstName(normalizeOptional(request.getFirstName()))
                .lastName(normalizeOptional(request.getLastName()))
                .bio(normalizeOptional(request.getBio()))
                .locale(request.getLocale())
                .theme(normalizeTheme(request.getTheme()))
                .avatarUrl(normalizeOptional(request.getAvatarUrl()))
                .preferences(request.getPreferences() == null ? null : new HashMap<>(request.getPreferences()))
                .build();
    }

    private String normalizeEmail(String email) {
        String normalizedEmail = normalizeOptional(email);
        if (normalizedEmail == null) {
            throw new ValidationException("Email is required");
        }
        return normalizedEmail.toLowerCase(Locale.ROOT);
    }

    private String normalizeTheme(String theme) {
        String normalizedTheme = normalizeOptional(theme);
        if (normalizedTheme == null) {
            return null;
        }

        String lowerCaseTheme = normalizedTheme.toLowerCase(Locale.ROOT);
        if (!ALLOWED_THEMES.contains(lowerCaseTheme)) {
            throw new ValidationException("theme", "Supported values are: light, dark");
        }
        return lowerCaseTheme;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void evictUserCache(UUID userId) {
        Cache cache = cacheManager.getCache(USERS_CACHE);
        if (cache != null) {
            cache.evict(userId);
        }
    }

    private String generateToken() {
        return UUID.randomUUID().toString();
    }
}
