package com.university.lms.course.dto;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseSettingsDto {
  private UUID id;
  private String code;
  private String titleUk;
  private String titleEn;
  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;
  private CourseVisibility visibility;
  private CourseStatus status;
  private UUID ownerId;
  private LocalDateTime updatedAt;
}
