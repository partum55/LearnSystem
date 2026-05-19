package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Contextual reminder item for student dashboard. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentContextReminderDto {
  private UUID assignmentId;
  private UUID courseId;
  private String courseCode;
  private String assignmentTitle;
  private String severity;
  private String recommendation;
  private boolean started;
  private boolean submitted;
  private double estimatedHours;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime dueDate;
}
