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
 * Request payload for saving grading draft data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeDraftRequest {

  @DecimalMin(value = "0.0", message = "Raw score must be non-negative")
  @DecimalMax(value = "999999.99", message = "Raw score is too large")
  private BigDecimal rawScore;

  @JsonAlias({"grade", "score"})
  @DecimalMin(value = "0.0", message = "Final score must be non-negative")
  @DecimalMax(value = "999999.99", message = "Final score is too large")
  private BigDecimal finalScore;

  private String feedback;

  @Builder.Default private Boolean overridePenalty = false;

  private Long version;
}
