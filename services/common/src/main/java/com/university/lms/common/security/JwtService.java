package com.university.lms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Supabase JWT validation service using JWKS.
 * Shared across Java services to validate tokens issued by Supabase Auth.
 */
@Service
@Slf4j
public class JwtService {

    private static final String CLAIM_USER_ID = "userId";
    private static final String CLAIM_SUB = "sub";
    private static final String CLAIM_ROLE = "role";

    @Value("${supabase.jwks-url:https://aarkyaevxuhlkefayzro.supabase.co/auth/v1/.well-known/jwks.json}")
    private String jwksUrl;

    private JwtDecoder jwtDecoder;

    @PostConstruct
    public void initialize() {
        if (jwksUrl != null && !jwksUrl.isBlank()) {
            try {
                this.jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl).build();
                log.info("Initialized JwtService with JWKS URL: {}", jwksUrl);
            } catch (Exception e) {
                log.error("Failed to initialize JwtDecoder with JWKS URL {}: {}", jwksUrl, e.getMessage());
            }
        } else {
            log.error("SUPABASE_JWKS_URL is not configured. JWT validation will fail.");
        }
    }

    /**
     * Extract user email from a Supabase token.
     */
    public String extractUsername(String token) {
        return extractClaim(token, jwt -> {
            String email = jwt.getClaimAsString("email");
            return email != null && !email.isBlank() ? email : jwt.getSubject();
        });
    }

    /**
     * Extract user ID from token. Supports both 'userId' and 'sub' (Supabase).
     */
    public UUID extractUserId(String token) {
        String userId = extractClaim(token, jwt -> {
            // First check for custom 'userId' claim
            String id = jwt.getClaimAsString(CLAIM_USER_ID);
            if (id == null || id.isBlank()) {
                // Fallback to standard OIDC 'sub' claim (which Supabase uses for UID)
                id = jwt.getSubject();
            }
            return id;
        });

        if (userId == null || userId.isBlank()) {
            throw new RuntimeException("Token is missing user identifier claim (userId or sub)");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Token contains invalid user identifier: " + userId);
        }
    }

    /**
     * Extract user role from token. Supports standard 'role' claim and Supabase 'app_metadata.role'.
     */
    public String extractRole(String token) {
        return extractClaim(token, jwt -> {
            String role = jwt.getClaimAsString(CLAIM_ROLE);
            if (role == null) {
                Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
                if (appMetadata != null) {
                    role = (String) appMetadata.get("role");
                }
            }
            return role;
        });
    }

    /**
     * Extract specific claim from token using a resolver function.
     */
    public <T> T extractClaim(String token, Function<Jwt, T> claimsResolver) {
        if (jwtDecoder == null) {
            throw new IllegalStateException("JwtDecoder is not initialized. Check SUPABASE_JWKS_URL.");
        }
        final Jwt jwt = jwtDecoder.decode(token);
        return claimsResolver.apply(jwt);
    }

    /**
     * Validate a Supabase access token signature and required subject.
     */
    public boolean validateAccessToken(String token) {
        if (jwtDecoder == null) {
            log.error("JwtDecoder not initialized; cannot validate token.");
            return false;
        }
        try {
            Jwt jwt = jwtDecoder.decode(token);
            return jwt.getSubject() != null && !jwt.getSubject().isBlank();
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }
}
