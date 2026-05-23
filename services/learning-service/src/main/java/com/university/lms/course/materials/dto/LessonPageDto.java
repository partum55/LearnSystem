package com.university.lms.course.materials.dto;

import com.university.lms.course.materials.entity.LessonPageType;
import java.util.Map;
import java.util.UUID;

public record LessonPageDto(
    UUID id,
    LessonPageType type,
    int order,
    String title,
    String content,
    String contentFormat,
    Map<String, Object> settings
) {}
