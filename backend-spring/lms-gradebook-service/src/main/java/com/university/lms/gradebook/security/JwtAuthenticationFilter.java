package com.university.lms.gradebook.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Gradebook service JWT authentication filter.
 * Extends common JWT filter. No user lookup needed - just validates tokens.
 */
@Component
@Slf4j
public class JwtAuthenticationFilter extends com.university.lms.common.security.JwtAuthenticationFilter {

    public JwtAuthenticationFilter(
            JwtService jwtService,
            JwtTokenBlacklistService tokenBlacklistService,
            SecurityAuditLogger auditLogger) {
        super(jwtService, tokenBlacklistService, auditLogger);
    }

    @Override
    protected UserDetails getUserDetails(UUID userId, String email) {
        // For gradebook service, we don't need to look up user in database
        // The token validation is sufficient, and user info is in the token
        return new UserDetails() {
            @Override
            public UUID getId() {
                return userId;
            }

            @Override
            public String getEmail() {
                return email;
            }

            @Override
            public String getRole() {
                return "USER"; // Will be overridden by token claims
            }

            @Override
            public boolean isActive() {
                return true; // Assume active if token is valid
            }
        };
    }
}

