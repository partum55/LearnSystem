package com.university.lms.course.materials.dto;

import com.university.lms.course.materials.entity.LessonBlockType;
import java.util.Map;
import java.util.UUID;

public record LessonBlockDto(
    UUID id,
    LessonBlockType type,
    int order,
    String title,
    String content,
    String contentFormat,
    Map<String, Object> settings
) {}
