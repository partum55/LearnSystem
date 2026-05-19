package com.university.lms.course.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Conflict payload returned when course publish is blocked by checklist. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishCourseBlockedResponse {

  private String message;
  private CoursePublishChecklistDto checklist;
}
