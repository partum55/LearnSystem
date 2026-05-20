package com.university.lms.course.assignments.dto;

import jakarta.validation.constraints.Min;
import java.util.List;

public record FileAssignmentSettingsDto(
    List<String> allowedFileTypes,
    @Min(1) Integer maxFiles,
    @Min(1) Integer maxFileSizeMb,
    Boolean allowEditAfterSubmit,
    Boolean allowDeleteAfterSubmit,
    Boolean allowResubmission
) {}
