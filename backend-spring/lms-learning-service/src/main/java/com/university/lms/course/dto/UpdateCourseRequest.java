package com.university.lms.course.dto;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for updating a course. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCourseRequest {

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String titleUk;

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String titleEn;

  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;

  private CourseVisibility visibility;
  private String thumbnailUrl;

  private LocalDate startDate;
  private LocalDate endDate;

  @Size(max = 20, message = "Academic year must not exceed 20 characters")
  private String academicYear;

  private UUID departmentId;

  @Min(value = 1, message = "Max students must be at least 1")
  @Max(value = 1000, message = "Max students must not exceed 1000")
  private Integer maxStudents;

  private CourseStatus status;
  private Boolean isPublished;
}
