package com.university.lms.course.dto;

import com.university.lms.common.domain.CourseVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request payload for cloning an existing course structure into a new course instance. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloneCourseStructureRequest {

  @NotBlank(message = "Course code is required")
  @Size(max = 50, message = "Course code must not exceed 50 characters")
  @Pattern(
      regexp = "^[A-Z0-9_-]+$",
      message =
          "Course code must contain only uppercase letters, numbers, underscores, and hyphens")
  private String code;

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String titleUk;

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String titleEn;

  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;

  private CourseVisibility visibility;
  private String thumbnailUrl;

  @Size(max = 20, message = "Theme color must not exceed 20 characters")
  private String themeColor;

  private LocalDate startDate;
  private LocalDate endDate;

  @Size(max = 20, message = "Academic year must not exceed 20 characters")
  private String academicYear;

  private Integer maxStudents;
  private Boolean isPublished;

  /** Copy assignment/module due and publish dates. Disabled by default for new semesters. */
  @Builder.Default private Boolean copyScheduleDates = false;
}
