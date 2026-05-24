package com.university.lms.course.dto;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPreviewResponse implements Serializable {
  private static final long serialVersionUID = 1L;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RowResult implements Serializable {
    private static final long serialVersionUID = 1L;
    private String email;
    private UUID userId;
    private String userName;
    private String role;
    private String status; // VALID, INVALID
    private String reason; // NOT_FOUND, DUPLICATE, ALREADY_ENROLLED, OWNER_NOT_ALLOWED, ROLE_CONFLICT
  }

  private List<RowResult> validRows;
  private List<RowResult> invalidRows;
  private boolean hasErrors;
}
