package com.university.lms.course.materials.dto;

import com.university.lms.course.materials.entity.LearningItemStatus;
import com.university.lms.course.materials.entity.LearningItemType;
import java.util.Map;
import java.util.UUID;

public record LearningItemDto(
    UUID id,
    UUID moduleId,
    LearningItemType type,
    String title,
    String description,
    int order,
    LearningItemStatus visibilityStatus,
    Map<String, Object> settings
) {}
