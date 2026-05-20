package com.university.lms.course.materials.dto;

import java.util.List;
import java.util.UUID;

public record LessonDetailDto(
    UUID id,
    UUID moduleId,
    String title,
    String summary,
    int order,
    String visibilityStatus,
    List<LessonBlockDto> blocks
) {}
