package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Upcoming assignment deadline summary for instructor dashboard. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherTodoDeadlineItemDto {
  private UUID assignmentId;
  private UUID courseId;
  private String courseCode;
  private String assignmentTitle;
  private int submittedCount;
  private int expectedStudentCount;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime dueDate;
}
