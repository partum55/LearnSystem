package com.university.lms.common.security;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Input sanitization and validation utility.
 */
@Component
public class InputSanitizer {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );
    private static final Pattern ALPHA_NUMERIC = Pattern.compile("^[a-zA-Z0-9]+$");
    private static final Pattern SAFE_TEXT = Pattern.compile("^[a-zA-Z0-9\\s.,!?'-]+$");
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );
    private static final Pattern SAFE_FILE_PATH_CHARS = Pattern.compile("[^A-Za-z0-9._-]");
    private static final Pattern MULTIPLE_UNDERSCORES = Pattern.compile("_+");

    private static final List<Pattern> XSS_PATTERNS = List.of(
            Pattern.compile("<script", Pattern.CASE_INSENSITIVE),
            Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("onerror=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("onload=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<iframe", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<object", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<embed", Pattern.CASE_INSENSITIVE)
    );

    private static final List<Pattern> SQL_INJECTION_PATTERNS = List.of(
            Pattern.compile("(--|/\\*|\\*/|;\\s*$)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bunion\\b\\s+\\bselect\\b", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\binsert\\b\\s+\\binto\\b", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bdelete\\b\\s+\\bfrom\\b", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bdrop\\b\\s+\\btable\\b", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bupdate\\b\\s+\\w+\\s+\\bset\\b", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\bexec(?:ute)?\\b\\s", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\b(?:or|and)\\b\\s+['\"]?\\d+['\"]?\\s*=\\s*['\"]?\\d+['\"]?", Pattern.CASE_INSENSITIVE)
    );

    public boolean isValidEmail(String email) {
        if (email == null) {
            return false;
        }
        String normalized = email.trim();
        return !normalized.isEmpty() && EMAIL_PATTERN.matcher(normalized).matches();
    }

    /**
     * Encodes common HTML characters to reduce XSS risk in rendered content.
     */
    public String sanitizeXSS(String input) {
        if (input == null) {
            return null;
        }

        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    public boolean containsXSS(String input) {
        return matchesAnyPattern(input, XSS_PATTERNS);
    }

    public boolean containsSQLInjection(String input) {
        return matchesAnyPattern(input, SQL_INJECTION_PATTERNS);
    }

    public boolean isValidUUID(String uuid) {
        if (uuid == null) {
            return false;
        }
        String normalized = uuid.trim();
        return !normalized.isEmpty() && UUID_PATTERN.matcher(normalized).matches();
    }

    public String sanitizeFilePath(String input) {
        if (input == null) {
            return null;
        }

        String sanitized = input
                .trim()
                .replace("..", "")
                .replace("./", "")
                .replace("\\", "")
                .replace(":", "");

        sanitized = SAFE_FILE_PATH_CHARS.matcher(sanitized).replaceAll("_");
        sanitized = MULTIPLE_UNDERSCORES.matcher(sanitized).replaceAll("_");
        return sanitized;
    }

    public boolean isAlphaNumeric(String input) {
        if (input == null) {
            return false;
        }
        String normalized = input.trim();
        return !normalized.isEmpty() && ALPHA_NUMERIC.matcher(normalized).matches();
    }

    public boolean isSafeText(String input) {
        if (input == null) {
            return false;
        }
        String normalized = input.trim();
        return !normalized.isEmpty() && SAFE_TEXT.matcher(normalized).matches();
    }

    public String sanitizeWithMaxLength(String input, int maxLength) {
        if (input == null) {
            return null;
        }

        String sanitized = sanitizeXSS(input.trim());
        if (maxLength < 0) {
            return sanitized;
        }
        return sanitized.length() > maxLength ? sanitized.substring(0, maxLength) : sanitized;
    }

    public boolean isValidURL(String url) {
        if (url == null) {
            return false;
        }

        String normalized = url.trim();
        if (normalized.isEmpty()) {
            return false;
        }

        try {
            URI uri = new URI(normalized);
            String scheme = uri.getScheme();
            return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                    && uri.getHost() != null
                    && !uri.getHost().isBlank();
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private boolean matchesAnyPattern(String input, List<Pattern> patterns) {
        if (input == null || input.isEmpty()) {
            return false;
        }
        for (Pattern pattern : patterns) {
            if (pattern.matcher(input).find()) {
                return true;
            }
        }
        return false;
    }
}
