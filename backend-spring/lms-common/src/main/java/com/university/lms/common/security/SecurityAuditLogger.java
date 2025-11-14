package com.university.lms.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Security audit logger for tracking security-relevant events.
 * Implements comprehensive audit logging for compliance and security monitoring.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SecurityAuditLogger {

    /**
     * Log successful authentication.
     */
    public void logSuccessfulAuthentication(String email, String ipAddress, String userAgent) {
        log.info("SECURITY_AUDIT: Successful authentication - Email: {}, IP: {}, Time: {}, UserAgent: {}",
                email, ipAddress, LocalDateTime.now(), sanitize(userAgent));
    }

    /**
     * Log failed authentication attempt.
     */
    public void logFailedAuthentication(String email, String ipAddress, String reason, String userAgent) {
        log.warn("SECURITY_AUDIT: Failed authentication - Email: {}, IP: {}, Reason: {}, Time: {}, UserAgent: {}",
                email, ipAddress, reason, LocalDateTime.now(), sanitize(userAgent));
    }

    /**
     * Log account lockout.
     */
    public void logAccountLockout(String email, String ipAddress, int failedAttempts) {
        log.warn("SECURITY_AUDIT: Account locked - Email: {}, IP: {}, FailedAttempts: {}, Time: {}",
                email, ipAddress, failedAttempts, LocalDateTime.now());
    }

    /**
     * Log password change.
     */
    public void logPasswordChange(String userId, String email, String ipAddress) {
        log.info("SECURITY_AUDIT: Password changed - UserId: {}, Email: {}, IP: {}, Time: {}",
                userId, email, ipAddress, LocalDateTime.now());
    }

    /**
     * Log suspicious activity.
     */
    public void logSuspiciousActivity(String description, String email, String ipAddress) {
        log.warn("SECURITY_AUDIT: Suspicious activity - Description: {}, Email: {}, IP: {}, Time: {}",
                description, email, ipAddress, LocalDateTime.now());
    }

    /**
     * Log privilege escalation attempt.
     */
    public void logPrivilegeEscalation(String userId, String attemptedAction, String ipAddress) {
        log.error("SECURITY_AUDIT: Privilege escalation attempt - UserId: {}, Action: {}, IP: {}, Time: {}",
                userId, attemptedAction, ipAddress, LocalDateTime.now());
    }

    /**
     * Log token revocation.
     */
    public void logTokenRevocation(String userId, String reason) {
        log.info("SECURITY_AUDIT: Token revoked - UserId: {}, Reason: {}, Time: {}",
                userId, reason, LocalDateTime.now());
    }

    /**
     * Log account creation.
     */
    public void logAccountCreation(String email, String ipAddress) {
        log.info("SECURITY_AUDIT: Account created - Email: {}, IP: {}, Time: {}",
                email, ipAddress, LocalDateTime.now());
    }

    /**
     * Log rate limit exceeded.
     */
    public void logRateLimitExceeded(String identifier, String endpoint) {
        log.warn("SECURITY_AUDIT: Rate limit exceeded - Identifier: {}, Endpoint: {}, Time: {}",
                identifier, endpoint, LocalDateTime.now());
    }

    /**
     * Log invalid JWT token attempt.
     */
    public void logInvalidTokenAttempt(String ipAddress, String reason) {
        log.warn("SECURITY_AUDIT: Invalid token attempt - IP: {}, Reason: {}, Time: {}",
                ipAddress, reason, LocalDateTime.now());
    }

    /**
     * Sanitize user input to prevent log injection.
     */
    private String sanitize(String input) {
        if (input == null) {
            return "";
        }
        // Remove newlines and carriage returns to prevent log injection
        return input.replaceAll("[\n\r]", "_");
    }
}

