package com.university.lms.user.security;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.SecurityAuditLogger;
import com.university.lms.user.domain.User;
import com.university.lms.user.repository.UserRepository;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * User service JWT authentication filter.
 * Extends common JWT filter with user-specific lookup logic.
 */
@Component
public class JwtAuthenticationFilter extends com.university.lms.common.security.JwtAuthenticationFilter {

    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            SecurityAuditLogger auditLogger,
            UserRepository userRepository) {
        super(jwtService, auditLogger);
        this.userRepository = userRepository;
    }

    @Override
    protected UserDetails getUserDetails(UUID userId, String email, String roleFromToken) {
        return userRepository.findByIdAndIsDeletedFalse(userId)
                .map(this::toUserDetails)
                .orElseGet(() -> autoProvisionUser(userId, email, roleFromToken));
    }

    private UserDetails autoProvisionUser(UUID userId, String email, String roleFromToken) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            return null;
        }

        User user = User.builder()
                .id(userId)
                .email(normalizedEmail)
                .displayName(defaultDisplayName(normalizedEmail))
                .role(UserRole.fromValue(roleFromToken))
                .locale(UserLocale.UK)
                .isActive(true)
                .isDeleted(false)
                .emailVerified(true)
                .build();

        try {
            return toUserDetails(userRepository.save(user));
        } catch (DataIntegrityViolationException ex) {
            return userRepository.findByIdAndIsDeletedFalse(userId)
                    .map(this::toUserDetails)
                    .orElse(null);
        }
    }

    private UserDetails toUserDetails(User user) {
        return new UserServiceUserDetails(
                user.getId(),
                user.getEmail(),
                roleName(user.getRole()),
                user.isActive()
        );
    }

    private String roleName(UserRole role) {
        return (role == null ? UserRole.USER : role).name();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultDisplayName(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex > 0) {
            return email.substring(0, atIndex);
        }
        return email;
    }

    private static final class UserServiceUserDetails implements UserDetails {
        private final UUID id;
        private final String email;
        private final String role;
        private final boolean active;

        private UserServiceUserDetails(UUID id, String email, String role, boolean active) {
            this.id = id;
            this.email = email;
            this.role = role;
            this.active = active;
        }

        @Override
        public UUID getId() {
            return id;
        }

        @Override
        public String getEmail() {
            return email;
        }

        @Override
        public String getRole() {
            return role;
        }

        @Override
        public boolean isActive() {
            return active;
        }
    }
}
