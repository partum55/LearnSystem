package com.university.lms.common.domain;

/**
 * User roles in the LMS system.
 * Maps directly from Django's ROLE_CHOICES.
 */
public enum UserRole {
    SUPERADMIN,
    TEACHER,
    STUDENT,
    TA;
}

