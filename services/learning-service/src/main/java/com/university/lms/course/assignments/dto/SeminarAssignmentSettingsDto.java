package com.university.lms.course.assignments.dto;

public record SeminarAssignmentSettingsDto(
    Boolean requiresSubmission,
    Boolean manualGradeOnly
) {}
