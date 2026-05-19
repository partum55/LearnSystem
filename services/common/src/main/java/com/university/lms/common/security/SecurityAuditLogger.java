package com.university.lms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Security audit logger for tracking security-relevant events.
 */
@Component
@Slf4j
public class SecurityAuditLogger {

    private static final int MAX_FIELD_LENGTH = 512;

    public void logSuccessfulAuthentication(String email, String ipAddress, String userAgent) {
        log.info(
                "SECURITY_AUDIT event=auth_success email={} ip={} userAgent={}",
                sanitize(email),
                sanitize(ipAddress),
                sanitize(userAgent)
        );
    }

    public void logFailedAuthentication(String email, String ipAddress, String reason, String userAgent) {
        log.warn(
                "SECURITY_AUDIT event=auth_failed email={} ip={} reason={} userAgent={}",
                sanitize(email),
                sanitize(ipAddress),
                sanitize(reason),
                sanitize(userAgent)
        );
    }

    public void logAccountLockout(String email, String ipAddress, int failedAttempts) {
        log.warn(
                "SECURITY_AUDIT event=account_lockout email={} ip={} attempts={}",
                sanitize(email),
                sanitize(ipAddress),
                failedAttempts
        );
    }

    public void logPasswordChange(String userId, String email, String ipAddress) {
        log.info(
                "SECURITY_AUDIT event=password_change userId={} email={} ip={}",
                sanitize(userId),
                sanitize(email),
                sanitize(ipAddress)
        );
    }

    public void logSuspiciousActivity(String description, String email, String ipAddress) {
        log.warn(
                "SECURITY_AUDIT event=suspicious_activity description={} email={} ip={}",
                sanitize(description),
                sanitize(email),
                sanitize(ipAddress)
        );
    }

    public void logPrivilegeEscalation(String userId, String attemptedAction, String ipAddress) {
        log.error(
                "SECURITY_AUDIT event=privilege_escalation userId={} action={} ip={}",
                sanitize(userId),
                sanitize(attemptedAction),
                sanitize(ipAddress)
        );
    }

    public void logTokenRevocation(String userId, String reason) {
        log.info(
                "SECURITY_AUDIT event=token_revocation userId={} reason={}",
                sanitize(userId),
                sanitize(reason)
        );
    }

    public void logAccountCreation(String email, String ipAddress) {
        log.info(
                "SECURITY_AUDIT event=account_created email={} ip={}",
                sanitize(email),
                sanitize(ipAddress)
        );
    }

    public void logRateLimitExceeded(String identifier, String endpoint) {
        log.warn(
                "SECURITY_AUDIT event=rate_limit_exceeded identifier={} endpoint={}",
                sanitize(identifier),
                sanitize(endpoint)
        );
    }

    public void logInvalidTokenAttempt(String ipAddress, String reason) {
        log.warn(
                "SECURITY_AUDIT event=invalid_token ip={} reason={}",
                sanitize(ipAddress),
                sanitize(reason)
        );
    }

    /**
     * Sanitizes user-controlled values to reduce log injection risk.
     */
    private String sanitize(String value) {
        if (value == null) {
            return "";
        }
        String sanitized = value
                .replace('\n', '_')
                .replace('\r', '_')
                .replace('\t', '_')
                .trim();
        if (sanitized.length() > MAX_FIELD_LENGTH) {
            return sanitized.substring(0, MAX_FIELD_LENGTH);
        }
        return sanitized;
    }
}
