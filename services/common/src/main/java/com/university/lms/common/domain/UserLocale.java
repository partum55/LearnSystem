package com.university.lms.common.domain;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * User locale preferences.
 * Maps directly from Django's LOCALE_CHOICES.
 */
public enum UserLocale {
    UK("uk", "Ukrainian"),
    EN("en", "English");

    private static final UserLocale DEFAULT = UK;
    private static final Map<String, UserLocale> LOOKUP = buildLookup();

    private final String code;
    private final String displayName;

    UserLocale(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static UserLocale fromCode(String code) {
        if (code == null || code.isBlank()) {
            return DEFAULT;
        }
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        return LOOKUP.getOrDefault(normalized, DEFAULT);
    }

    private static Map<String, UserLocale> buildLookup() {
        Map<String, UserLocale> lookup = new HashMap<>();
        for (UserLocale locale : values()) {
            lookup.put(locale.code, locale);
            lookup.put(locale.name().toLowerCase(Locale.ROOT), locale);
        }
        return Map.copyOf(lookup);
    }
}
