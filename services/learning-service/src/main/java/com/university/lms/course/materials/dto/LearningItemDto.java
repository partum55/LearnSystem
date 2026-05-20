package com.university.lms.course.materials.dto;

import java.util.Map;
import java.util.UUID;

public record LearningItemDto(
    UUID id,
    UUID moduleId,
    String type,
    String title,
    String description,
    int order,
    String visibilityStatus,
    Map<String, Object> settings
) {}
