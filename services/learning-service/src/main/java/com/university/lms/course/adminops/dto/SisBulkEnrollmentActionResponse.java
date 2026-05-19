package com.university.lms.course.adminops.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisBulkEnrollmentActionResponse {
  private String action;
  private int affectedUsers;
  private int affectedEnrollments;
  private int skipped;
  private String message;
}
