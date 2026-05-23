package com.university.lms.course.domain;

public enum ModuleStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED;

    public boolean isVisible() {
        return this == PUBLISHED;
    }
}
