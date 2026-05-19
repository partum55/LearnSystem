package com.university.lms.common.domain;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Course status.
 * Maps directly from Django's Course.STATUS_CHOICES.
 */
public enum CourseStatus {
    DRAFT("draft"),
    PUBLISHED("published"),
    ARCHIVED("archived");

    private static final CourseStatus DEFAULT = DRAFT;
    private static final Map<String, CourseStatus> LOOKUP = buildLookup();

    private final String value;

    CourseStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CourseStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return LOOKUP.getOrDefault(normalized, DEFAULT);
    }

    private static Map<String, CourseStatus> buildLookup() {
        Map<String, CourseStatus> lookup = new HashMap<>();
        for (CourseStatus status : values()) {
            lookup.put(status.value, status);
            lookup.put(status.name().toLowerCase(Locale.ROOT), status);
        }
        return Map.copyOf(lookup);
    }

    @Override
    public String toString() {
        return value;
    }
}
