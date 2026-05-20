package com.university.lms.course.assignments.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AssignmentRequest(
    @NotNull String type,
    @NotBlank String title,
    String description,
    String instructions,
    @NotNull @DecimalMin("0.0") BigDecimal maxPoints,
    @PositiveOrZero Integer order,
    LocalDateTime dueDate,
    Boolean visible,
    @Valid FileAssignmentSettingsDto fileSettings,
    @Valid RteAssignmentSettingsDto rteSettings,
    @Valid FormAssignmentSettingsDto formSettings,
    @Valid QuizAssignmentSettingsDto quizSettings,
    @Valid VplAssignmentSettingsDto vplSettings,
    @Valid SeminarAssignmentSettingsDto seminarSettings
) {}
