package com.university.lms.ai.dto.persistence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCourseCreateRequest {
  private String code;
  private String titleUk;
  private String titleEn;
  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;
  private String ownerId;
  private String visibility;
  private String status;
  private boolean isPublished;
  private String startDate;
  private String endDate;
  private String academicYear;
  private Integer maxStudents;
}
