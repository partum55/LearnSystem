package com.university.lms.course.dto;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCourseSettingsRequest {

  @NotBlank(message = "Course code is required")
  @Size(max = 50, message = "Course code must not exceed 50 characters")
  private String code;

  @NotBlank(message = "Course title is required")
  @Size(max = 255, message = "Course title must not exceed 255 characters")
  private String titleUk;

  @Size(max = 255, message = "English title must not exceed 255 characters")
  private String titleEn;

  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;
  private CourseVisibility visibility;
  private CourseStatus status;
}
