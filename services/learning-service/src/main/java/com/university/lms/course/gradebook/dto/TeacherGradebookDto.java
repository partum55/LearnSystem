package com.university.lms.course.gradebook.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TeacherGradebookDto(
    UUID courseId,
    List<StudentDto> students,
    List<AssignmentColumnDto> assignments,
    List<GradeCellDto> grades
) {
  public record StudentDto(UUID id, String displayName, String email, String avatarUrl) {
    public StudentDto(UUID id, String displayName, String email) {
      this(id, displayName, email, null);
    }
  }
  public record AssignmentColumnDto(
      UUID id,
      UUID moduleId,
      String title,
      String type,
      BigDecimal maxPoints,
      LocalDateTime dueDate
  ) {}
  public record GradeCellDto(
      UUID studentId,
      UUID assignmentId,
      UUID submissionId,
      BigDecimal draftPoints,
      BigDecimal publishedPoints,
      BigDecimal maxPoints,
      String status,
      String comment
  ) {}
}
