package com.university.lms.common.security;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Input sanitization and validation utility.
 * Prevents injection attacks (XSS, SQL Injection, etc.)
 */
@Component
public class InputSanitizer {

    // Patterns for validation
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    private static final Pattern ALPHA_NUMERIC = Pattern.compile("^[a-zA-Z0-9]+$");

    private static final Pattern SAFE_TEXT = Pattern.compile("^[a-zA-Z0-9\\s.,!?'-]+$");

    // Dangerous characters/patterns
    private static final Pattern[] XSS_PATTERNS = {
            Pattern.compile("<script", Pattern.CASE_INSENSITIVE),
            Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("onerror=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("onload=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<iframe", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<object", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<embed", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern[] SQL_INJECTION_PATTERNS = {
            Pattern.compile("('|(\\-\\-)|(;)|(\\|\\|)|(\\*))", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(union.*select)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(insert.*into)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(delete.*from)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(drop.*table)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(update.*set)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(exec(ute)?\\s)", Pattern.CASE_INSENSITIVE)
    };

    /**
     * Validate email format.
     */
    public boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Sanitize string to prevent XSS attacks.
     */
    public String sanitizeXSS(String input) {
        if (input == null) {
            return null;
        }

        String sanitized = input;

        // HTML encode special characters
        sanitized = sanitized.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;")
                .replace("/", "&#x2F;");

        return sanitized;
    }

    /**
     * Check if input contains potential XSS attack vectors.
     */
    public boolean containsXSS(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }

        for (Pattern pattern : XSS_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if input contains potential SQL injection patterns.
     */
    public boolean containsSQLInjection(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }

        for (Pattern pattern : SQL_INJECTION_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validate UUID format.
     */
    public boolean isValidUUID(String uuid) {
        if (uuid == null || uuid.trim().isEmpty()) {
            return false;
        }

        Pattern uuidPattern = Pattern.compile(
                "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
        );

        return uuidPattern.matcher(uuid).matches();
    }

    /**
     * Sanitize string for safe use in file paths.
     */
    public String sanitizeFilePath(String input) {
        if (input == null) {
            return null;
        }

        // Remove path traversal attempts
        String sanitized = input.replace("..", "")
                .replace("./", "")
                .replace("\\", "")
                .replace(":", "");

        // Only allow alphanumeric, dash, underscore, and dot
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._-]", "_");

        return sanitized;
    }

    /**
     * Validate alphanumeric string.
     */
    public boolean isAlphaNumeric(String input) {
        if (input == null || input.trim().isEmpty()) {
            return false;
        }
        return ALPHA_NUMERIC.matcher(input).matches();
    }

    /**
     * Validate safe text (alphanumeric + common punctuation).
     */
    public boolean isSafeText(String input) {
        if (input == null || input.trim().isEmpty()) {
            return false;
        }
        return SAFE_TEXT.matcher(input).matches();
    }

    /**
     * Validate and sanitize input with maximum length.
     */
    public String sanitizeWithMaxLength(String input, int maxLength) {
        if (input == null) {
            return null;
        }

        String sanitized = sanitizeXSS(input.trim());

        if (sanitized.length() > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    /**
     * Validate URL format.
     */
    public boolean isValidURL(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }

        Pattern urlPattern = Pattern.compile(
                "^(https?)://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$"
        );

        return urlPattern.matcher(url).matches();
    }
}

