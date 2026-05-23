package com.university.lms.course.domain;

public enum CourseMemberStatus {
    ACTIVE,
    DROPPED,
    COMPLETED;

    public boolean isActive() {
        return this == ACTIVE;
    }
}
