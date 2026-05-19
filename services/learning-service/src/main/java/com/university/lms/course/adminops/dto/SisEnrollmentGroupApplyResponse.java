package com.university.lms.course.adminops.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisEnrollmentGroupApplyResponse {
  private String groupCode;
  private int createdEnrollments;
  private int skippedEnrollments;
  private String message;
}
