package com.university.lms.course.adminops.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisImportRunResponse {
  private UUID id;
  private String semesterCode;
  private String status;
  private boolean valid;
  private UUID requestedBy;
  private Map<String, Object> summary;
  private List<SisImportRowErrorDto> errors;
  private List<String> warnings;
  private Map<String, Object> applyReport;
  private LocalDateTime appliedAt;
  private LocalDateTime rollbackExpiresAt;
  private LocalDateTime rolledBackAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
