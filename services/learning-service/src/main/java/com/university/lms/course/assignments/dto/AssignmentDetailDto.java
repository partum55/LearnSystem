package com.university.lms.course.assignments.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public record AssignmentDetailDto(
    UUID id,
    UUID courseId,
    UUID moduleId,
    com.university.lms.course.assessment.domain.AssignmentType type,
    String title,
    Map<String, Object> instructionsJson,
    BigDecimal maxPoints,
    LocalDateTime dueDate,
    String visibilityStatus,
    Map<String, Object> settings,
    StudentAssignmentStateDto studentState
) {}
