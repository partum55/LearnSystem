package com.university.lms.ai.dto;

import java.math.BigDecimal;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Response DTO for detailed AI usage statistics. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIUsageStatsResponse {

  private String period;

  // Overall metrics
  private long totalTokens;
  private long totalRequests;
  private long failedRequests;
  private BigDecimal totalCostUsd;
  private double successRate;

  // Breakdown by provider
  private Map<String, ProviderStats> byProvider;

  // Breakdown by content type
  private Map<String, ContentTypeStats> byContentType;

  // Performance metrics
  private double p50LatencyMs;
  private double p95LatencyMs;
  private double p99LatencyMs;
  private double avgLatencyMs;

  // Cache metrics
  private long cacheHits;
  private long cacheMisses;
  private double cacheHitRate;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ProviderStats {
    private String provider;
    private long requests;
    private long tokens;
    private long failures;
    private double avgLatencyMs;
    private BigDecimal estimatedCostUsd;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ContentTypeStats {
    private String contentType;
    private long requests;
    private long tokens;
    private double avgLatencyMs;
  }
}
