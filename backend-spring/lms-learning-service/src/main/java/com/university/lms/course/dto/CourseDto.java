package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for Course entity responses. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDto implements Serializable {

  private static final long serialVersionUID = 1L;

  private UUID id;
  private String code;

  // Multilingual fields
  private String titleUk;
  private String titleEn;
  private String descriptionUk;
  private String descriptionEn;
  private String syllabus;

  private UUID ownerId;
  private String ownerName; // Enriched from user service

  private CourseVisibility visibility;
  private String thumbnailUrl;
  private String themeColor;

  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate startDate;

  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate endDate;

  private String academicYear;
  private UUID departmentId;
  private Integer maxStudents;
  private Integer currentEnrollment;

  private CourseStatus status;
  private Boolean isPublished;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime createdAt;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime updatedAt;

  // Computed fields
  private Boolean hasCapacity;
  private Boolean isActive;
  private Integer moduleCount;
  private Integer memberCount;
}
