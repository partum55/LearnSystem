package com.university.lms.common.domain;

public enum CourseVisibility {
    PUBLIC,
    PRIVATE,
    DRAFT;

    public static CourseVisibility fromValue(String value) {
        if (value == null || value.isBlank()) return DRAFT;
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return DRAFT;
        }
    }
}
