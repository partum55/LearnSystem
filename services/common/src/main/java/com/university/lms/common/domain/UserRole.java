package com.university.lms.common.domain;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Global platform roles.
 *
 * <p>Course-local permissions are represented separately by CourseMembership.roleInCourse.
 */
public enum UserRole {
    ADMIN,
    TEACHER,
    USER;

    private static final UserRole DEFAULT = USER;
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
