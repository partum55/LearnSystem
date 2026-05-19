package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Statistics for a single A/B test variant. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ABTestVariantStats {

  private String variantName;
  private int sampleSize;
  private int successCount;
  private double successRate;
  private double averageLatencyMs;
  private double averageQualityScore;
  private double averageUserRating;
  private long totalTokens;
}
