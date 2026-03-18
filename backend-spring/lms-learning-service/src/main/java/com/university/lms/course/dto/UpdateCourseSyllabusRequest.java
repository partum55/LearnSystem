package com.university.lms.course.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request DTO for updating course syllabus. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCourseSyllabusRequest {

  @Size(max = 8000, message = "Syllabus must not exceed 8000 characters")
  private String syllabus;
}
