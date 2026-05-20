package com.university.lms.course.materials.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.Map;

public record LearningMaterialRequest(
    @NotNull String type,
    @NotBlank String title,
    String description,
    @PositiveOrZero Integer order,
    String url,
    String textContent,
    Boolean downloadable,
    Boolean visible,
    Map<String, Object> settings
) {}
