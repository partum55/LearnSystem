package com.university.lms.course.assignments.dto;

import jakarta.validation.constraints.Min;

public record RteAssignmentSettingsDto(
    @Min(0) Integer minWords,
    @Min(1) Integer maxWords,
    Boolean allowEditAfterSubmit,
    Boolean allowResubmission
) {}
