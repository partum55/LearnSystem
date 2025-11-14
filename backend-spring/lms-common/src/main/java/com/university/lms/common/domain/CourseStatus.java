package com.university.lms.common.domain;

/**
 * Course status.
 * Maps directly from Django's Course.STATUS_CHOICES.
 */
public enum CourseStatus {
    DRAFT("draft"),
    PUBLISHED("published"),
    ARCHIVED("archived");

    private final String value;

    CourseStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}

