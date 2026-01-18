package com.university.lms.analytics.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * JWT authentication filter for Analytics Service.
 * Provides lightweight user details since analytics service doesn't maintain user data.
 */
@Component
public class JwtAuthenticationFilter extends com.university.lms.common.security.JwtAuthenticationFilter {

    public JwtAuthenticationFilter(JwtService jwtService,
                                   JwtTokenBlacklistService tokenBlacklistService,
                                   SecurityAuditLogger auditLogger) {
        super(jwtService, tokenBlacklistService, auditLogger);
    }

    @Override
    protected com.university.lms.common.security.JwtAuthenticationFilter.UserDetails getUserDetails(UUID userId, String email) {
        // Analytics service trusts the JWT token claims
        // User details come from the token itself
        return new com.university.lms.common.security.JwtAuthenticationFilter.UserDetails() {
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
                return "USER"; // Default role, actual role is extracted from token
            }

            @Override
            public boolean isActive() {
                return true;
            }
        };
    }
}

