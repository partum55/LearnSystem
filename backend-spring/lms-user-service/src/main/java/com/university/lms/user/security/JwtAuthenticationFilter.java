package com.university.lms.user.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import com.university.lms.user.domain.User;
import com.university.lms.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * User service JWT authentication filter.
 * Extends common JWT filter with user-specific lookup logic.
 */
@Component
@Slf4j
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
    protected UserDetails getUserDetails(UUID userId, String email) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return null;
        }

        return new UserDetails() {
            @Override
            public UUID getId() {
                return user.getId();
            }

            @Override
            public String getEmail() {
                return user.getEmail();
            }

            @Override
            public String getRole() {
                return user.getRole().name();
            }

            @Override
            public boolean isActive() {
                return user.isActive();
            }
        };
    }
}
