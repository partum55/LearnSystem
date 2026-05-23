package com.university.lms.course.assessment.domain;

public enum AssignmentStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED;

    public boolean isVisible() {
        return this == PUBLISHED;
    }
}
