package com.university.lms.submission.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Bulk publish result payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkPublishGradesResponse {

  private int total;
  private int published;

  @Builder.Default private List<ItemResult> results = new ArrayList<>();

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ItemResult {
    private UUID submissionId;
    private String status;
    private String message;
  }
}
