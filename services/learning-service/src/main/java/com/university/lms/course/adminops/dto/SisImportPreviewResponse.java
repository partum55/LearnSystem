package com.university.lms.course.adminops.dto;

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
public class SisImportPreviewResponse {
  private UUID importId;
  private String semesterCode;
  private String status;
  private boolean valid;
  private Map<String, Object> summary;
  private List<SisImportRowErrorDto> errors;
  private List<String> warnings;
}
