package com.university.lms.course.assignments.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

public record AssignmentRequest(
    @NotNull String type,
    @NotBlank String title,
    String description,
    String instructions,
    @NotNull @DecimalMin("0.0") BigDecimal maxPoints,
    @PositiveOrZero Integer order,
    LocalDateTime dueDate,
    Boolean visible,
    Map<String, Object> settings
) {}
