package com.university.lms.common.domain;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Course visibility levels.
 * Maps directly from Django's Course.VISIBILITY_CHOICES.
 */
public enum CourseVisibility {
    PUBLIC("public"),
    PRIVATE("private"),
    DRAFT("draft");

    private static final CourseVisibility DEFAULT = DRAFT;
    private static final Map<String, CourseVisibility> LOOKUP = buildLookup();

    private final String value;

    CourseVisibility(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CourseVisibility fromValue(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return LOOKUP.getOrDefault(normalized, DEFAULT);
    }

    private static Map<String, CourseVisibility> buildLookup() {
        Map<String, CourseVisibility> lookup = new HashMap<>();
        for (CourseVisibility visibility : values()) {
            lookup.put(visibility.value, visibility);
            lookup.put(visibility.name().toLowerCase(Locale.ROOT), visibility);
        }
        return Map.copyOf(lookup);
    }

    @Override
    public String toString() {
        return value;
    }
}
