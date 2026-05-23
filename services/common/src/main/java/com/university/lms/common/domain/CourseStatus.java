package com.university.lms.common.domain;

public enum CourseStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED;

    public static CourseStatus fromValue(String value) {
        if (value == null || value.isBlank()) return DRAFT;
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return DRAFT;
        }
    }
}
