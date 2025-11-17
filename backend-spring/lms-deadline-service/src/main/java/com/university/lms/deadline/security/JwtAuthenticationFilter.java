package com.university.lms.deadline.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Lightweight JWT filter inheriting logic from lms-common.
 */
@Component
public class JwtAuthenticationFilter extends com.university.lms.common.security.JwtAuthenticationFilter {

    public JwtAuthenticationFilter(JwtService jwtService,
                                   JwtTokenBlacklistService tokenBlacklistService,
                                   SecurityAuditLogger auditLogger) {
        super(jwtService, tokenBlacklistService, auditLogger);
    }

    @Override
    protected UserDetails getUserDetails(UUID userId, String email) {
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
                return "USER";
            }

            @Override
            public boolean isActive() {
                return true;
            }
        };
    }
}

