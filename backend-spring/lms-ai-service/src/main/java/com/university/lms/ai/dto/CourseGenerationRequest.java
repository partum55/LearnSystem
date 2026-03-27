package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request DTO for generating course content with AI */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseGenerationRequest {

  private String prompt;

  @Builder.Default
  private String language = "uk"; // uk or en

  @Builder.Default
  private Boolean includeModules = true;

  @Builder.Default
  private Boolean includeAssignments = false;

  @Builder.Default
  private Boolean includeQuizzes = false;

  private String academicYear;
}
