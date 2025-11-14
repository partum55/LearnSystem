package com.university.lms.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

/**
 * Base JWT authentication filter with token blacklist and audit logging.
 * Services should extend this and implement getUserDetails() for their specific user lookup.
 */
@Slf4j
public abstract class JwtAuthenticationFilter extends OncePerRequestFilter {

    protected final JwtService jwtService;
    protected final JwtTokenBlacklistService tokenBlacklistService;
    protected final SecurityAuditLogger auditLogger;

    protected JwtAuthenticationFilter(
            JwtService jwtService,
            JwtTokenBlacklistService tokenBlacklistService,
            SecurityAuditLogger auditLogger) {
        this.jwtService = jwtService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.auditLogger = auditLogger;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        try {
            String jwt = extractJwtFromRequest(request);

            if (jwt != null) {
                // Check if token is blacklisted
                if (tokenBlacklistService.isBlacklisted(jwt)) {
                    log.warn("Attempt to use blacklisted token from IP: {}", getClientIP(request));
                    auditLogger.logInvalidTokenAttempt(getClientIP(request), "Token is blacklisted");
                    sendUnauthorizedResponse(response, "Token has been revoked");
                    return;
                }

                // Validate token
                if (jwtService.validateToken(jwt)) {
                    UUID userId = jwtService.extractUserId(jwt);
                    String email = jwtService.extractUsername(jwt);
                    String role = jwtService.extractRole(jwt);

                    // Get user details from service-specific implementation
                    UserDetails userDetails = getUserDetails(userId, email);

                    if (userDetails != null && userDetails.isActive()) {
                        // Create authentication token
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails.getEmail(),
                                null,
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + userDetails.getRole()))
                        );

                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        // Set authentication in security context
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        // Add user info to request attributes for controllers
                        request.setAttribute("userId", userId);
                        request.setAttribute("userRole", userDetails.getRole());
                        request.setAttribute("userEmail", userDetails.getEmail());
                    } else {
                        log.warn("User not found or inactive for userId: {}", userId);
                        auditLogger.logInvalidTokenAttempt(getClientIP(request), "User not found or inactive");
                    }
                } else {
                    auditLogger.logInvalidTokenAttempt(getClientIP(request), "Invalid token signature or expired");
                }
            }
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
            auditLogger.logInvalidTokenAttempt(getClientIP(request), "Token parsing error: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Service-specific user lookup. Return null if user not found or inactive.
     */
    protected abstract UserDetails getUserDetails(UUID userId, String email);

    /**
     * Extract JWT token from Authorization header.
     */
    private String extractJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }

    /**
     * Get client IP address.
     */
    protected String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }

        return request.getRemoteAddr();
    }

    /**
     * Send unauthorized response.
     */
    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + message + "\"}");
    }

    /**
     * Simple user details interface for authentication.
     */
    public interface UserDetails {
        UUID getId();
        String getEmail();
        String getRole();
        boolean isActive();
    }
}

