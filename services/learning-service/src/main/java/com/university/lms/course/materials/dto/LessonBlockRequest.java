package com.university.lms.course.materials.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record LessonBlockRequest(
    String type,
    @Size(max = 255) String title,
    String content,
    String contentFormat,
    @PositiveOrZero Integer order,
    String url,
    Map<String, Object> settings
) {}
