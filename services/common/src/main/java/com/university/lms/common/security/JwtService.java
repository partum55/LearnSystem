package com.university.lms.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Supabase JWT validation service shared across Java services.
 */
@Service
@Slf4j
public class JwtService {

    private static final String CLAIM_USER_ID = "userId";
    private static final String CLAIM_SUB = "sub";
    private static final String CLAIM_ROLE = "role";
    @Value("${jwt.secret}")
    private String jwtSecret;

    private SecretKey signingKey;
    private JwtParser jwtParser;

    @PostConstruct
    public void initialize() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT secret must not be blank. For Supabase integration, use the JWT Secret from settings.");
        }

        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        
        this.jwtParser = Jwts.parser()
                .verifyWith(signingKey)
                .build();
    }

    /**
     * Extract user email from a Supabase token.
     */
    public String extractUsername(String token) {
        return extractClaim(token, claims -> {
            String email = claims.get("email", String.class);
            return email != null && !email.isBlank() ? email : claims.getSubject();
        });
    }

    /**
     * Extract user ID from token. Supports both 'userId' and 'sub' (Supabase).
     */
    public UUID extractUserId(String token) {
        String userId = extractClaim(token, claims -> {
            String id = claims.get(CLAIM_USER_ID, String.class);
            if (id == null || id.isBlank()) {
                id = claims.get(CLAIM_SUB, String.class);
            }
            return id;
        });

        if (userId == null || userId.isBlank()) {
            throw new JwtException("Token is missing user identifier claim (userId or sub)");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            throw new JwtException("Token contains invalid user identifier", e);
        }
    }

    /**
     * Extract user role from token. Supports standard 'role' claim and Supabase 'app_metadata.role'.
     */
    public String extractRole(String token) {
        return extractClaim(token, claims -> {
            String role = claims.get(CLAIM_ROLE, String.class);
            if (role == null) {
                Map<String, Object> appMetadata = claims.get("app_metadata", Map.class);
                if (appMetadata != null) {
                    role = (String) appMetadata.get("role");
                }
            }
            return role;
        });
    }

    /**
     * Extract expiration date from token.
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extract specific claim from token.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extract all claims from token.
     */
    private Claims extractAllClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtException("JWT token must not be blank");
        }

        try {
            return jwtParser.parseSignedClaims(token).getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("JWT token is expired: {}", e.getMessage());
            throw e;
        } catch (UnsupportedJwtException e) {
            log.debug("JWT token is unsupported: {}", e.getMessage());
            throw e;
        } catch (MalformedJwtException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            throw e;
        } catch (SecurityException e) {
            log.debug("Invalid JWT signature: {}", e.getMessage());
            throw e;
        } catch (IllegalArgumentException e) {
            log.debug("JWT claims are invalid: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Check if token is expired.
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Validate token format and signature.
     */
    public boolean validateToken(String token) {
        return tryExtractClaims(token) != null;
    }

    /**
     * Validate a Supabase access token signature and required subject.
     */
    public boolean validateAccessToken(String token) {
        Claims claims = tryExtractClaims(token);
        return claims != null && claims.getSubject() != null && !claims.getSubject().isBlank();
    }

    private Claims tryExtractClaims(String token) {
        try {
            return extractAllClaims(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return null;
        }
    }
}
