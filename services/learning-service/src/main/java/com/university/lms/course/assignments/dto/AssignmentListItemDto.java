package com.university.lms.course.assignments.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record AssignmentListItemDto(
    UUID id,
    UUID moduleId,
    String title,
    String type,
    int order,
    BigDecimal maxPoints,
    LocalDateTime dueDate,
    String status,
    GradePreviewDto grade
) {}
