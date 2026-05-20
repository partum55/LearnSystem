package com.university.lms.course.assignments.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public record AssignmentDetailDto(
    UUID id,
    UUID courseId,
    UUID moduleId,
    String type,
    String title,
    String description,
    String instructions,
    BigDecimal maxPoints,
    LocalDateTime dueDate,
    String visibilityStatus,
    Map<String, Object> settings,
    StudentAssignmentStateDto studentState
) {}
