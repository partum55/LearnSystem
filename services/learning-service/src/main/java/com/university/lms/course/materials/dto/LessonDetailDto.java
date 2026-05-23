package com.university.lms.course.materials.dto;

import com.university.lms.course.materials.entity.LearningItemStatus;
import java.util.List;
import java.util.UUID;

public record LessonDetailDto(
    UUID id,
    UUID moduleId,
    String title,
    String summary,
    int order,
    LearningItemStatus visibilityStatus,
    List<LessonPageDto> pages
) {}
