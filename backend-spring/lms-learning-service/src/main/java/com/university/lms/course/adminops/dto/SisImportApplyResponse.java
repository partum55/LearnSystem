package com.university.lms.course.adminops.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisImportApplyResponse {
  private UUID importId;
  private String status;
  private String message;
  private int createdCourses;
  private int createdEnrollments;
  private int skippedEnrollments;
  private LocalDateTime rollbackExpiresAt;
}
