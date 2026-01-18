package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response DTO for system-wide AI usage summary.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIUsageSummaryResponse {

    private String period;
    private long totalTokens;
    private long totalRequests;
    private long totalFailedRequests;
    private BigDecimal totalCostUsd;
    private int activeUsers;
    private double averageTokensPerRequest;
    private double averageLatencyMs;
}

