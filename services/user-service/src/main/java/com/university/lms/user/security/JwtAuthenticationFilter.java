package com.university.lms.user.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import com.university.lms.user.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * User service JWT authentication filter.
 * Extends common JWT filter with user-specific lookup logic.
 */
@Component
public class JwtAuthenticationFilter extends com.university.lms.common.security.JwtAuthenticationFilter {

    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            JwtTokenBlacklistService tokenBlacklistService,
            SecurityAuditLogger auditLogger,
            UserRepository userRepository) {
        super(jwtService, tokenBlacklistService, auditLogger);
        this.userRepository = userRepository;
    }

    @Override
    protected UserDetails getUserDetails(UUID userId, String email, String roleFromToken) {
        return userRepository.findByIdAndIsDeletedFalse(userId)
                .map(user -> new UserServiceUserDetails(
                        user.getId(),
                        user.getEmail(),
                        user.getRole() != null ? user.getRole().name() : null,
                        user.isActive()
                ))
                .orElse(null);
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
