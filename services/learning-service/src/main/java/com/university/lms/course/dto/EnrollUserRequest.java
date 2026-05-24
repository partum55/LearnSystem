package com.university.lms.course.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for enrolling a user in a course. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollUserRequest {

  private UUID userId;
  private String email;

  @NotNull(message = "Role is required")
  private com.university.lms.course.domain.CourseRole roleInCourse;
}
