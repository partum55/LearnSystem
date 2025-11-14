package com.university.lms.common.security;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Password policy validator implementing security best practices.
 * Based on OWASP Password Guidelines and NIST SP 800-63B.
 */
@Component
public class PasswordPolicyValidator {

    // Minimum password length (NIST recommends at least 8)
    private static final int MIN_LENGTH = 12;

    // Maximum password length
    private static final int MAX_LENGTH = 128;

    // Common password patterns to reject
    private static final Pattern[] WEAK_PATTERNS = {
            Pattern.compile("(?i)password"),
            Pattern.compile("(?i)123456"),
            Pattern.compile("(?i)qwerty"),
            Pattern.compile("(?i)admin"),
            Pattern.compile("(?i)letmein"),
            Pattern.compile("(?i)welcome"),
            Pattern.compile("(?i)monkey"),
            Pattern.compile("(?i)dragon")
    };

    // Character type patterns
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern DIGIT = Pattern.compile("\\d");
    private static final Pattern SPECIAL_CHAR = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]");

    /**
     * Validate password against security policy.
     *
     * @param password the password to validate
     * @return validation result with errors if any
     */
    public PasswordValidationResult validate(String password) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.isEmpty()) {
            errors.add("Password is required");
            return new PasswordValidationResult(false, errors);
        }

        // Check length
        if (password.length() < MIN_LENGTH) {
            errors.add("Password must be at least " + MIN_LENGTH + " characters long");
        }

        if (password.length() > MAX_LENGTH) {
            errors.add("Password must not exceed " + MAX_LENGTH + " characters");
        }

        // Check character diversity
        int characterTypes = 0;
        if (LOWERCASE.matcher(password).find()) characterTypes++;
        if (UPPERCASE.matcher(password).find()) characterTypes++;
        if (DIGIT.matcher(password).find()) characterTypes++;
        if (SPECIAL_CHAR.matcher(password).find()) characterTypes++;

        if (characterTypes < 3) {
            errors.add("Password must contain at least 3 of the following: lowercase letters, uppercase letters, numbers, special characters");
        }

        // Check for common weak passwords
        for (Pattern pattern : WEAK_PATTERNS) {
            if (pattern.matcher(password).find()) {
                errors.add("Password contains common weak patterns and is not allowed");
                break;
            }
        }

        // Check for repeated characters
        if (hasRepeatedCharacters(password, 3)) {
            errors.add("Password contains too many repeated characters");
        }

        // Check for sequential characters
        if (hasSequentialCharacters(password, 4)) {
            errors.add("Password contains sequential characters (e.g., '1234', 'abcd')");
        }

        return new PasswordValidationResult(errors.isEmpty(), errors);
    }

    /**
     * Check if password contains repeated characters.
     */
    private boolean hasRepeatedCharacters(String password, int maxRepeats) {
        if (password.length() < maxRepeats) {
            return false;
        }

        for (int i = 0; i <= password.length() - maxRepeats; i++) {
            char c = password.charAt(i);
            boolean allSame = true;

            for (int j = 1; j < maxRepeats; j++) {
                if (password.charAt(i + j) != c) {
                    allSame = false;
                    break;
                }
            }

            if (allSame) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if password contains sequential characters.
     */
    private boolean hasSequentialCharacters(String password, int sequenceLength) {
        if (password.length() < sequenceLength) {
            return false;
        }

        for (int i = 0; i <= password.length() - sequenceLength; i++) {
            boolean isSequential = true;

            for (int j = 1; j < sequenceLength; j++) {
                if (password.charAt(i + j) != password.charAt(i + j - 1) + 1) {
                    isSequential = false;
                    break;
                }
            }

            if (isSequential) {
                return true;
            }
        }

        return false;
    }

    /**
     * Password validation result.
     */
    public static class PasswordValidationResult {
        private final boolean valid;
        private final List<String> errors;

        public PasswordValidationResult(boolean valid, List<String> errors) {
            this.valid = valid;
            this.errors = errors;
        }

        public boolean isValid() {
            return valid;
        }

        public List<String> getErrors() {
            return errors;
        }

        public String getErrorMessage() {
            return String.join("; ", errors);
        }
    }
}

