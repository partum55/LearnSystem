package com.university.lms.ai.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;

/**
 * Entity for tracking AI token usage and costs per user.
 */
@Entity
@Table(name = "ai_user_usage", indexes = {
        @Index(name = "idx_ai_user_usage_user_period", columnList = "user_id, usage_period"),
        @Index(name = "idx_ai_user_usage_period", columnList = "usage_period")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIUserUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * User ID
     */
    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    /**
     * Usage period (YYYY-MM format)
     */
    @Column(name = "usage_period", nullable = false, length = 7)
    private String usagePeriod;

    /**
     * Total prompt tokens used
     */
    @Column(name = "prompt_tokens")
    @Builder.Default
    private long promptTokens = 0;

    /**
     * Total completion tokens used
     */
    @Column(name = "completion_tokens")
    @Builder.Default
    private long completionTokens = 0;

    /**
     * Total tokens (prompt + completion)
     */
    @Column(name = "total_tokens")
    @Builder.Default
    private long totalTokens = 0;

    /**
     * Number of successful requests
     */
    @Column(name = "request_count")
    @Builder.Default
    private int requestCount = 0;

    /**
     * Number of failed requests
     */
    @Column(name = "failed_request_count")
    @Builder.Default
    private int failedRequestCount = 0;

    /**
     * Estimated cost in USD (based on token pricing)
     */
    @Column(name = "estimated_cost_usd", precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal estimatedCostUsd = BigDecimal.ZERO;

    /**
     * Last updated timestamp
     */
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
        totalTokens = promptTokens + completionTokens;
    }

    /**
     * Add tokens to usage
     */
    public void addTokens(int prompt, int completion) {
        this.promptTokens += prompt;
        this.completionTokens += completion;
        this.totalTokens = this.promptTokens + this.completionTokens;
        this.requestCount++;
    }

    /**
     * Record a failed request
     */
    public void recordFailure() {
        this.failedRequestCount++;
    }

    /**
     * Calculate and update estimated cost
     */
    public void updateCost(BigDecimal promptPricePerMillion, BigDecimal completionPricePerMillion) {
        BigDecimal promptCost = BigDecimal.valueOf(promptTokens)
                .divide(BigDecimal.valueOf(1_000_000), 10, java.math.RoundingMode.HALF_UP)
                .multiply(promptPricePerMillion);

        BigDecimal completionCost = BigDecimal.valueOf(completionTokens)
                .divide(BigDecimal.valueOf(1_000_000), 10, java.math.RoundingMode.HALF_UP)
                .multiply(completionPricePerMillion);

        this.estimatedCostUsd = promptCost.add(completionCost);
    }

    /**
     * Get current period string (YYYY-MM)
     */
    public static String currentPeriod() {
        return YearMonth.now().toString();
    }

    /**
     * Create a new usage record for a user and current period
     */
    public static AIUserUsage createForUser(String userId) {
        return AIUserUsage.builder()
                .userId(userId)
                .usagePeriod(currentPeriod())
                .build();
    }
}

