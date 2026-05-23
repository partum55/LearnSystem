package com.university.lms.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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

  @NotNull(message = "User ID is required")
  private UUID userId;

  @NotNull(message = "Role is required")
  private com.university.lms.course.domain.CourseRole roleInCourse;
}
