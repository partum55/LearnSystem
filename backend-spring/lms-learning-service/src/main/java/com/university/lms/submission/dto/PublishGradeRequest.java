package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for publishing a previously drafted grade.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublishGradeRequest {

  @JsonAlias({"grade", "score"})
  @DecimalMin(value = "0.0", message = "Final score must be non-negative")
  @DecimalMax(value = "999999.99", message = "Final score is too large")
  private BigDecimal finalScore;

  private String feedback;

  private Long version;
}
