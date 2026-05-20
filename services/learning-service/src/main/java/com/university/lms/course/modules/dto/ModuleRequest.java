package com.university.lms.course.modules.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record ModuleRequest(
    @NotBlank String title,
    String description,
    @PositiveOrZero Integer order,
    Boolean visible
) {}
