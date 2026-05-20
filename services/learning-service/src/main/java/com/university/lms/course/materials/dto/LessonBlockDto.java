package com.university.lms.course.materials.dto;

import java.util.Map;
import java.util.UUID;

public record LessonBlockDto(
    UUID id,
    String type,
    int order,
    String title,
    String content,
    String contentFormat,
    Map<String, Object> settings
) {}
