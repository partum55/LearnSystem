package com.university.lms.course.adminops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisBulkEnrollmentActionRequest {

  @NotBlank private String action;

  @NotEmpty private List<String> emails;

  @NotEmpty private List<String> courseCodes;

  private String targetCourseCode;

  private String enrollmentStatus;
}
