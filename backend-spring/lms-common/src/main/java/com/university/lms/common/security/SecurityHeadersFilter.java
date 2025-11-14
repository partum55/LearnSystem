package com.university.lms.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Security headers filter implementing OWASP security best practices.
 * Adds comprehensive security headers to all HTTP responses.
 */
@Component
@Slf4j
public class SecurityHeadersFilter extends OncePerRequestFilter {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // Generate CSP nonce for inline scripts
        String nonce = generateNonce();
        request.setAttribute("cspNonce", nonce);

        // Content Security Policy - Prevent XSS attacks
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                        "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "img-src 'self' data: https:; " +
                        "connect-src 'self'; " +
                        "frame-ancestors 'none'; " +
                        "base-uri 'self'; " +
                        "form-action 'self'; " +
                        "upgrade-insecure-requests;");

        // Strict Transport Security - Force HTTPS
        response.setHeader("Strict-Transport-Security",
                "max-age=31536000; includeSubDomains; preload");

        // X-Frame-Options - Prevent clickjacking
        response.setHeader("X-Frame-Options", "DENY");

        // X-Content-Type-Options - Prevent MIME sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");

        // X-XSS-Protection - Enable XSS filter (legacy browsers)
        response.setHeader("X-XSS-Protection", "1; mode=block");

        // Referrer-Policy - Control referrer information
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Permissions-Policy - Disable unnecessary browser features
        response.setHeader("Permissions-Policy",
                "geolocation=(), microphone=(), camera=(), payment=(), usb=(), " +
                        "magnetometer=(), gyroscope=(), speaker=()");

        // X-Permitted-Cross-Domain-Policies - Restrict cross-domain access
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none");

        // Cache-Control for sensitive endpoints
        if (isSensitiveEndpoint(request)) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");
        }

        // Remove server information disclosure
        response.setHeader("Server", "");
        response.setHeader("X-Powered-By", "");

        filterChain.doFilter(request, response);
    }

    private String generateNonce() {
        byte[] nonceBytes = new byte[16];
        SECURE_RANDOM.nextBytes(nonceBytes);
        return Base64.getEncoder().encodeToString(nonceBytes);
    }

    private boolean isSensitiveEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.contains("/auth/") ||
                path.contains("/users/") ||
                path.contains("/admin/") ||
                path.contains("/actuator/");
    }
}

