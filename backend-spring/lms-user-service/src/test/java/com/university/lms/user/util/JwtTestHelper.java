package com.university.lms.user.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Helper class for generating JWT tokens in tests.
 */
public class JwtTestHelper {

    private static final String SECRET = "test-secret-key-for-testing-purposes-must-be-at-least-256-bits-long-hs256";
    private static final long EXPIRATION = 3600000; // 1 hour

    public static String generateToken(UUID userId, String email, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("email", email);
        claims.put("role", role);

        Key key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
            .setClaims(claims)
            .setSubject(email)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }

    public static String generateStudentToken() {
        return generateToken(
            UUID.randomUUID(),
            "student@ucu.edu.ua",
            "STUDENT"
        );
    }

    public static String generateTeacherToken() {
        return generateToken(
            UUID.randomUUID(),
            "teacher@ucu.edu.ua",
            "TEACHER"
        );
    }

    public static String generateAdminToken() {
        return generateToken(
            UUID.randomUUID(),
            "admin@ucu.edu.ua",
            "ADMIN"
        );
    }

    public static String generateTokenWithUserId(UUID userId) {
        return generateToken(userId, "test@ucu.edu.ua", "STUDENT");
    }
}

