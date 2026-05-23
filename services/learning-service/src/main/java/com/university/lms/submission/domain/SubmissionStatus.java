package com.university.lms.submission.domain;

public enum SubmissionStatus {
    DRAFT,
    SUBMITTED,
    LATE,
    GRADED,
    RETURNED,
    PUBLISHED,
    IN_REVIEW,
    WITHDRAWN;

    public boolean isSubmitted() {
        return this == SUBMITTED || this == LATE;
    }

    public boolean isGraded() {
        return this == GRADED || this == PUBLISHED;
    }

    public boolean isPublishedToStudent() {
        return this == PUBLISHED;
    }
}
