package com.university.lms.common.security;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

/**
 * Supabase JWT validation service using JWKS with legacy HS256 fallback.
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

    @Value("${supabase.jwt-secret:${JWT_SECRET:}}")
    private String jwtSecret;

    private JwtDecoder jwksDecoder;
    private JwtDecoder hmacDecoder;

    @PostConstruct
    public void initialize() {
        if (jwksUrl != null && !jwksUrl.isBlank()) {
            try {
                this.jwksDecoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl).build();
                log.info("Initialized JwtService with JWKS URL: {}", jwksUrl);
            } catch (Exception e) {
                log.error("Failed to initialize JwtDecoder with JWKS URL {}: {}", jwksUrl, e.getMessage());
            }
        } else {
            log.warn("SUPABASE_JWKS_URL is not configured.");
        }

        if (jwtSecret != null && !jwtSecret.isBlank()) {
            try {
                SecretKey secretKey = new SecretKeySpec(
                        jwtSecret.getBytes(StandardCharsets.UTF_8),
                        "HmacSHA256"
                );
                this.hmacDecoder = NimbusJwtDecoder
                        .withSecretKey(secretKey)
                        .macAlgorithm(MacAlgorithm.HS256)
                        .build();
                log.info("Initialized JwtService with HS256 fallback.");
            } catch (Exception e) {
                log.error("Failed to initialize HS256 JwtDecoder: {}", e.getMessage());
            }
        }

        if (jwksDecoder == null && hmacDecoder == null) {
            log.error("No Supabase JWT decoder configured. JWT validation will fail.");
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
            Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
            if (appMetadata != null) {
                Object appRole = appMetadata.get("role");
                if (appRole instanceof String role && !role.isBlank()) {
                    return role;
                }
            }
            return jwt.getClaimAsString(CLAIM_ROLE);
        });
    }

    /**
     * Extract specific claim from token using a resolver function.
     */
    public <T> T extractClaim(String token, Function<Jwt, T> claimsResolver) {
        final Jwt jwt = decodeToken(token);
        return claimsResolver.apply(jwt);
    }

    /**
     * Validate a Supabase access token signature and required subject.
     */
    public boolean validateAccessToken(String token) {
        try {
            Jwt jwt = decodeToken(token);
            return jwt.getSubject() != null && !jwt.getSubject().isBlank();
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    private Jwt decodeToken(String token) {
        JwtException jwksFailure = null;

        if (jwksDecoder != null) {
            try {
                return jwksDecoder.decode(token);
            } catch (JwtException ex) {
                jwksFailure = ex;
            }
        }

        if (hmacDecoder != null) {
            try {
                return hmacDecoder.decode(token);
            } catch (JwtException ex) {
                if (jwksFailure != null) {
                    ex.addSuppressed(jwksFailure);
                }
                throw ex;
            }
        }

        if (jwksFailure != null) {
            throw jwksFailure;
        }
        throw new IllegalStateException("No Supabase JWT decoder is initialized.");
    }
}
