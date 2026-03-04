package com.university.lms.course.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Result metadata for course structure clone operation. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloneCourseStructureResultDto {
  private UUID sourceCourseId;
  private UUID courseId;
  private int modulesCopied;
  private int resourcesCopied;
  private int assignmentsCopied;
  private int quizzesCopied;
}
