package com.university.lms.course.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Module summary used on course preview landing pages. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoursePreviewModuleDto {
  private UUID moduleId;
  private String title;
  private String description;
  private Integer position;

  @Builder.Default private List<String> resourceTitles = new ArrayList<>();
  @Builder.Default private List<String> assignmentTitles = new ArrayList<>();
}
