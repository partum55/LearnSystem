package com.university.lms.course.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Course pre-flight checklist response before publish. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoursePublishChecklistDto {

  private UUID courseId;
  private boolean readyToPublish;

  @Builder.Default
  private List<CoursePublishChecklistItemDto> items = new ArrayList<>();
}
