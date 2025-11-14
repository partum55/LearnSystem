package com.university.lms.common.domain;

/**
 * Course visibility levels.
 * Maps directly from Django's Course.VISIBILITY_CHOICES.
 */
public enum CourseVisibility {
    PUBLIC,
    PRIVATE,
    DRAFT
}

