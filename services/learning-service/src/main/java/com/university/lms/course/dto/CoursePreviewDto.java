package com.university.lms.course.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Public preview payload for elective-course landing pages. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoursePreviewDto {
  private UUID courseId;
  private String code;
  private String titleUk;
  private String titleEn;
  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;
  private UUID ownerId;
  private String ownerName;
  private String thumbnailUrl;
  private String themeColor;
  private String academicYear;
  private int moduleCount;
  private int assignmentCount;

  @Builder.Default private List<CoursePreviewModuleDto> modules = new ArrayList<>();
}
