package com.university.lms.course.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Optional payload for publishing courses with checklist override support. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishCourseRequest {

  @Builder.Default
  private Boolean forcePublish = false;

  @Size(max = 500, message = "Override reason must not exceed 500 characters")
  private String overrideReason;
}
