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
import java.util.Locale;
import java.util.UUID;

/**
 * Base JWT authentication filter with token blacklist and audit logging.
 * Services should extend this and implement getUserDetails() for their specific user lookup.
 */
@Slf4j
public abstract class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

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

        String clientIp = getClientIP(request);

        try {
            String jwt = extractJwtFromRequest(request);

            if (jwt != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Check if token is blacklisted
                if (tokenBlacklistService.isBlacklisted(jwt)) {
                    log.warn("Attempt to use blacklisted token from IP: {}", clientIp);
                    auditLogger.logInvalidTokenAttempt(clientIp, "Token is blacklisted");
                    sendUnauthorizedResponse(response, "Token has been revoked");
                    return;
                }

                // Validate token
                if (jwtService.validateAccessToken(jwt)) {
                    UUID userId = jwtService.extractUserId(jwt);
                    String email = jwtService.extractUsername(jwt);
                    String roleFromToken = jwtService.extractRole(jwt);

                    // Get user details from service-specific implementation
                    UserDetails userDetails = getUserDetails(userId, email);

                    if (userDetails != null && userDetails.isActive()) {
                        String effectiveRole = resolveRole(userDetails.getRole(), roleFromToken);
                        if (effectiveRole == null) {
                            log.warn("Token missing role claim for userId: {}", userId);
                            auditLogger.logInvalidTokenAttempt(clientIp, "Token missing role claim");
                            sendUnauthorizedResponse(response, "Token missing role claim");
                            return;
                        }

                        // Create authentication token
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails.getEmail(),
                                null,
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + effectiveRole))
                        );

                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        // Set authentication in security context
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        // Add user info to request attributes for controllers
                        request.setAttribute("userId", userId);
                        request.setAttribute("userRole", effectiveRole);
                        request.setAttribute("userEmail", userDetails.getEmail());
                    } else {
                        log.warn("User not found or inactive for userId: {}", userId);
                        auditLogger.logInvalidTokenAttempt(clientIp, "User not found or inactive");
                    }
                } else {
                    SecurityContextHolder.clearContext();
                    auditLogger.logInvalidTokenAttempt(clientIp, "Invalid token signature or expired");
                }
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            log.error("Cannot set user authentication: {}", e.getMessage());
            auditLogger.logInvalidTokenAttempt(clientIp, "Token parsing error: " + e.getMessage());
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
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);

        if (bearerToken != null && bearerToken.startsWith(BEARER_PREFIX)) {
            String token = bearerToken.substring(BEARER_PREFIX.length()).trim();
            return token.isEmpty() ? null : token;
        }

        String tokenFromQuery = request.getParameter("token");
        if (tokenFromQuery != null && !tokenFromQuery.isBlank()) {
            return tokenFromQuery.trim();
        }

        return null;
    }

    private String resolveRole(String roleFromUser, String roleFromToken) {
        if (roleFromUser != null && !roleFromUser.isBlank()) {
            return roleFromUser.trim().toUpperCase(Locale.ROOT);
        }
        if (roleFromToken != null && !roleFromToken.isBlank()) {
            return roleFromToken.trim().toUpperCase(Locale.ROOT);
        }
        return null;
    }

    /**
     * Get client IP address.
     */
    protected String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isBlank()) {
            return xRealIP;
        }

        return request.getRemoteAddr();
    }

    /**
     * Send unauthorized response.
     */
    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("WWW-Authenticate", "Bearer");
        response.getWriter()
                .write("{\"code\":\"UNAUTHORIZED\",\"message\":\"" + jsonEscape(message) + "\"}");
    }

    private String jsonEscape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
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
