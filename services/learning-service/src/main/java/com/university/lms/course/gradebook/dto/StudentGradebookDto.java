package com.university.lms.course.gradebook.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StudentGradebookDto(
    UUID courseId,
    String courseTitle,
    GradebookTotalDto total,
    List<ModuleGradeDto> modules
) {
  public record GradebookTotalDto(BigDecimal points, BigDecimal maxPoints, BigDecimal percentage) {}
  public record ModuleGradeDto(
      UUID moduleId,
      String title,
      GradebookTotalDto total,
      List<AssignmentGradeDto> assignments
  ) {}
  public record AssignmentGradeDto(
      UUID assignmentId,
      String title,
      com.university.lms.course.assessment.domain.AssignmentType type,
      BigDecimal points,
      BigDecimal maxPoints,
      String status,
      String comment
  ) {}
}
