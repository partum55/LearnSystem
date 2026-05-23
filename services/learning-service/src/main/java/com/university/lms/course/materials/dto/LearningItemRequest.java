package com.university.lms.course.materials.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import com.university.lms.course.materials.entity.LearningItemType;
import java.util.Map;

public record LearningItemRequest(
    LearningItemType type,
    @Size(max = 255) String title,
    String description,
    @PositiveOrZero Integer order,
    String url,
    String textContent,
    Boolean downloadable,
    Boolean visible,
    Map<String, Object> settings
) {}
