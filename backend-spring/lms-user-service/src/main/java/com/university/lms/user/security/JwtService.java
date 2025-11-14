package com.university.lms.user.security;

import com.university.lms.user.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * User-specific JWT token generation service.
 * Wraps common JwtService with user domain logic.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class JwtService {

    private final com.university.lms.common.security.JwtService commonJwtService;

    /**
     * Generate access token for user.
     */
    public String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().name());

        return commonJwtService.generateToken(claims, user.getEmail());
    }

    /**
     * Generate refresh token for user.
     */
    public String generateRefreshToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("role", user.getRole().name());

        return commonJwtService.generateRefreshToken(claims, user.getEmail());
    }

    /**
     * Validate token against user.
     */
    public Boolean validateToken(String token, User user) {
        final String username = commonJwtService.extractUsername(token);
        return (username.equals(user.getEmail()) && !commonJwtService.isTokenExpired(token));
    }

    /**
     * Get token expiration time in milliseconds.
     */
    public Long getExpirationTime() {
        return commonJwtService.getExpirationTime();
    }
}

