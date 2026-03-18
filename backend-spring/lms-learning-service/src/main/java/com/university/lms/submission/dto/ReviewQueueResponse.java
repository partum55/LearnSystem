package com.university.lms.submission.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Paginated review queue payload for teacher submission checking.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewQueueResponse {

  private List<SubmissionResponse> content;
  private int pageNumber;
  private int pageSize;
  private long totalElements;
  private int totalPages;
}
