package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request for editing existing course content with AI */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseEditRequest {

  private String prompt;

  private String entityType; // COURSE, MODULE, ASSIGNMENT, QUIZ

  private String currentData; // JSON representation of current entity

  @Builder.Default
  private String language = "uk";
}
