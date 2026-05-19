package com.university.lms.common.security;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Password policy validator implementing OWASP and NIST-aligned checks.
 */
@Component
public class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 12;
    private static final int MAX_LENGTH = 128;
    private static final int MIN_CHARACTER_TYPES = 3;
    private static final int MAX_REPEATED_CHARACTERS = 3;
    private static final int SEQUENCE_LENGTH = 4;

    private static final List<Pattern> WEAK_PATTERNS = List.of(
            Pattern.compile("(?i)password"),
            Pattern.compile("(?i)123456"),
            Pattern.compile("(?i)qwerty"),
            Pattern.compile("(?i)admin"),
            Pattern.compile("(?i)letmein"),
            Pattern.compile("(?i)welcome"),
            Pattern.compile("(?i)monkey"),
            Pattern.compile("(?i)dragon")
    );

    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern DIGIT = Pattern.compile("\\d");
    private static final Pattern SPECIAL_CHAR = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]");

    public PasswordValidationResult validate(String password) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.isBlank()) {
            errors.add("Password is required");
            return PasswordValidationResult.invalid(errors);
        }

        String normalizedPassword = password.strip();

        if (normalizedPassword.length() < MIN_LENGTH) {
            errors.add("Password must be at least " + MIN_LENGTH + " characters long");
        }

        if (normalizedPassword.length() > MAX_LENGTH) {
            errors.add("Password must not exceed " + MAX_LENGTH + " characters");
        }

        if (containsWhitespace(normalizedPassword)) {
            errors.add("Password must not contain whitespace characters");
        }

        if (characterTypeCount(normalizedPassword) < MIN_CHARACTER_TYPES) {
            errors.add("Password must contain at least 3 of the following: lowercase letters, uppercase letters, numbers, special characters");
        }

        if (containsWeakPattern(normalizedPassword)) {
            errors.add("Password contains common weak patterns and is not allowed");
        }

        if (hasRepeatedCharacters(normalizedPassword, MAX_REPEATED_CHARACTERS)) {
            errors.add("Password contains too many repeated characters");
        }

        if (hasSequentialCharacters(normalizedPassword, SEQUENCE_LENGTH)) {
            errors.add("Password contains sequential characters (e.g., '1234', 'abcd')");
        }

        return errors.isEmpty() ? PasswordValidationResult.valid() : PasswordValidationResult.invalid(errors);
    }

    private int characterTypeCount(String password) {
        int characterTypes = 0;
        if (LOWERCASE.matcher(password).find()) {
            characterTypes++;
        }
        if (UPPERCASE.matcher(password).find()) {
            characterTypes++;
        }
        if (DIGIT.matcher(password).find()) {
            characterTypes++;
        }
        if (SPECIAL_CHAR.matcher(password).find()) {
            characterTypes++;
        }
        return characterTypes;
    }

    private boolean containsWeakPattern(String password) {
        String normalized = password.toLowerCase(Locale.ROOT);
        for (Pattern pattern : WEAK_PATTERNS) {
            if (pattern.matcher(normalized).find()) {
                return true;
            }
        }
        return false;
    }

    private boolean containsWhitespace(String password) {
        for (int i = 0; i < password.length(); i++) {
            if (Character.isWhitespace(password.charAt(i))) {
                return true;
            }
        }
        return false;
    }

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

    private boolean hasSequentialCharacters(String password, int sequenceLength) {
        if (password.length() < sequenceLength) {
            return false;
        }

        for (int i = 0; i <= password.length() - sequenceLength; i++) {
            boolean ascending = true;
            boolean descending = true;

            for (int j = 1; j < sequenceLength; j++) {
                int prev = password.charAt(i + j - 1);
                int curr = password.charAt(i + j);
                if (curr != prev + 1) {
                    ascending = false;
                }
                if (curr != prev - 1) {
                    descending = false;
                }
                if (!ascending && !descending) {
                    break;
                }
            }

            if (ascending || descending) {
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

        private PasswordValidationResult(boolean valid, List<String> errors) {
            this.valid = valid;
            this.errors = errors == null ? List.of() : List.copyOf(errors);
        }

        public static PasswordValidationResult valid() {
            return new PasswordValidationResult(true, List.of());
        }

        public static PasswordValidationResult invalid(List<String> errors) {
            return new PasswordValidationResult(false, errors);
        }

        public boolean isValid() {
            return valid;
        }

        public List<String> getErrors() {
            return errors;
        }

        public String getErrorMessage() {
            if (errors.isEmpty()) {
                return "";
            }
            return String.join("; ", errors);
        }
    }
}
