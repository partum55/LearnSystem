package com.university.lms.course.materials.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import com.university.lms.course.materials.entity.LessonBlockType;
import java.util.Map;

public record LessonBlockRequest(
    LessonBlockType type,
    @Size(max = 255) String title,
    String content,
    String contentFormat,
    @PositiveOrZero Integer order,
    String url,
    Map<String, Object> settings
) {}
