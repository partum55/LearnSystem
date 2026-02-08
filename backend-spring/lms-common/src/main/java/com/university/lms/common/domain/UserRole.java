package com.university.lms.common.domain;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * User roles in the LMS system.
 * Maps directly from Django's ROLE_CHOICES.
 */
public enum UserRole {
    SUPERADMIN,
    TEACHER,
    STUDENT,
    TA;

    private static final UserRole DEFAULT = STUDENT;
    private static final Map<String, UserRole> LOOKUP = buildLookup();

    public static UserRole fromValue(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return LOOKUP.getOrDefault(normalized, DEFAULT);
    }

    private static Map<String, UserRole> buildLookup() {
        Map<String, UserRole> lookup = new HashMap<>();
        for (UserRole role : values()) {
            lookup.put(role.name().toLowerCase(Locale.ROOT), role);
        }
        return Map.copyOf(lookup);
    }
}
