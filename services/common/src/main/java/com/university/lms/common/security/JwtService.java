package com.university.lms.common.security;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.util.Map;
import java.util.Collection;
import java.util.UUID;
import java.util.function.Function;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import com.nimbusds.jwt.SignedJWT;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Supabase JWT validation service using JWKS with legacy HS256 fallback.
 * Shared across Java services to validate tokens issued by Supabase Auth.
 */
@Service
@Slf4j
public class JwtService {

    private static final String CLAIM_USER_ID = "userId";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_AUDIENCE = "aud";
    private static final String DEFAULT_ISSUER = "https://aarkyaevxuhlkefayzro.supabase.co/auth/v1";
    private static final String DEFAULT_AUDIENCE = "authenticated";

    @Value("${supabase.jwks-url:https://aarkyaevxuhlkefayzro.supabase.co/auth/v1/.well-known/jwks.json}")
    private String jwksUrl;

    @Value("${supabase.issuer:" + DEFAULT_ISSUER + "}")
    private String issuer;

    @Value("${supabase.audience:" + DEFAULT_AUDIENCE + "}")
    private String audience;

    @Value("${supabase.legacy-hs256-secret:${SUPABASE_JWT_SECRET:${JWT_SECRET:}}}")
    private String legacyHs256Secret;

    private JwtDecoder jwksDecoder;
    private JwtDecoder hmacDecoder;

    @PostConstruct
    public void initialize() {
        if (jwksUrl != null && !jwksUrl.isBlank()) {
            try {
                NimbusJwtDecoder nimbusJwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl)
                        .jwsAlgorithms(algorithms -> {
                            algorithms.add(SignatureAlgorithm.ES256);
                            algorithms.add(SignatureAlgorithm.RS256);
                        })
                        .build();
                nimbusJwtDecoder.setJwtValidator(createJwtValidator());
                this.jwksDecoder = nimbusJwtDecoder;
                log.info(
                        "Initialized JwtService with JWKS URL {} (algorithms: ES256, RS256, issuer: {}, audience: {})",
                        jwksUrl,
                        issuer,
                        audience);
            } catch (Exception e) {
                log.error("Failed to initialize JwtDecoder with JWKS URL {}: {}", jwksUrl, e.getMessage());
            }
        } else {
            log.warn("SUPABASE_JWKS_URL is not configured.");
        }

        if (legacyHs256Secret != null && !legacyHs256Secret.isBlank()) {
            try {
                SecretKey secretKey = new SecretKeySpec(
                        legacyHs256Secret.getBytes(StandardCharsets.UTF_8),
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
        String algorithm = resolveAlgorithm(token);

        if (MacAlgorithm.HS256.getName().equalsIgnoreCase(algorithm)) {
            return decodeWithDecoder(hmacDecoder, token, "HS256");
        }

        if (SignatureAlgorithm.ES256.getName().equalsIgnoreCase(algorithm)
                || SignatureAlgorithm.RS256.getName().equalsIgnoreCase(algorithm)) {
            return decodeWithDecoder(jwksDecoder, token, algorithm);
        }

        if (algorithm != null) {
            throw new JwtException("Unsupported JWT algorithm: " + algorithm);
        }

        if (jwksDecoder != null) {
            return jwksDecoder.decode(token);
        }

        if (hmacDecoder != null) {
            return hmacDecoder.decode(token);
        }
        throw new IllegalStateException("No Supabase JWT decoder is initialized.");
    }

    private Jwt decodeWithDecoder(JwtDecoder decoder, String token, String algorithm) {
        if (decoder == null) {
            throw new JwtException("No JWT decoder configured for algorithm: " + algorithm);
        }
        return decoder.decode(token);
    }

    private String resolveAlgorithm(String token) {
        try {
            return SignedJWT.parse(token).getHeader().getAlgorithm().getName();
        } catch (ParseException e) {
            return null;
        }
    }

    private OAuth2TokenValidator<Jwt> createJwtValidator() {
        OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> audienceValidator = jwt -> {
            if (!StringUtils.hasText(audience)) {
                return OAuth2TokenValidatorResult.success();
            }

            Object claim = jwt.getClaims().get(CLAIM_AUDIENCE);
            boolean audienceMatch = false;
            if (claim instanceof String claimValue) {
                audienceMatch = audience.equals(claimValue);
            } else if (claim instanceof Collection<?> collection) {
                audienceMatch = collection.stream().anyMatch(audience::equals);
            }

            if (audienceMatch) {
                return OAuth2TokenValidatorResult.success();
            }

            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error(
                            "invalid_token",
                            "Token audience must be " + audience,
                            null));
        };

        return jwt -> {
            OAuth2TokenValidatorResult issuerResult = issuerValidator.validate(jwt);
            if (issuerResult.hasErrors()) {
                return issuerResult;
            }
            return audienceValidator.validate(jwt);
        };
    }
}
