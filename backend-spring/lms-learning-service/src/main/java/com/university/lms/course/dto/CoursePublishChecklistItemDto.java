package com.university.lms.course.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Single publish-check item used in course pre-flight checks. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoursePublishChecklistItemDto {

  private String key;
  private String label;
  private boolean required;
  private boolean passed;
  private String details;
}
