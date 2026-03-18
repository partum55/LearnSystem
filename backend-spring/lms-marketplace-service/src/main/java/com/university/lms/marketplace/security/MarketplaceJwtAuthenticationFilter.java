package com.university.lms.marketplace.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * JWT authentication filter for the Marketplace Service.
 * Trusts the claims encoded in the token; no local user store is consulted.
 */
@Component
public class MarketplaceJwtAuthenticationFilter
        extends com.university.lms.common.security.JwtAuthenticationFilter {

    private static final String DEFAULT_ROLE = "USER";

    public MarketplaceJwtAuthenticationFilter(
            JwtService jwtService,
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
                // Return a non-null default role to ensure deterministic access control.
                return DEFAULT_ROLE;
            }

            @Override
            public boolean isActive() {
                return true;
            }
        };
    }
}
