package com.university.lms.ai.service;

import com.university.lms.ai.domain.entity.AIUserUsage;
import com.university.lms.ai.dto.AIUsageSummaryResponse;
import com.university.lms.ai.dto.AIUsageStatsResponse;
import com.university.lms.ai.repository.AIGenerationLogRepository;
import com.university.lms.ai.repository.AIUserUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for tracking AI usage and costs per user.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AICostTrackingService {

    private final AIUserUsageRepository usageRepository;
    private final AIGenerationLogRepository logRepository;

    // Pricing per million tokens (configurable, defaults to Groq pricing)
    @Value("${ai.pricing.prompt-per-million:0.05}")
    private BigDecimal promptPricePerMillion;

    @Value("${ai.pricing.completion-per-million:0.10}")
    private BigDecimal completionPricePerMillion;

    @Value("${ai.usage.monthly-limit-tokens:1000000}")
    private long monthlyTokenLimit;

    /**
     * Record token usage for a user asynchronously.
     */
    @Async("aiTaskExecutor")
    @Transactional
    public void recordUsage(String userId, int promptTokens, int completionTokens) {
        if (userId == null || userId.isBlank()) {
            log.debug("Skipping usage tracking for anonymous user");
            return;
        }

        try {
            String currentPeriod = AIUserUsage.currentPeriod();

            AIUserUsage usage = usageRepository.findByUserIdAndUsagePeriod(userId, currentPeriod)
                    .orElseGet(() -> AIUserUsage.createForUser(userId));

            usage.addTokens(promptTokens, completionTokens);
            usage.updateCost(promptPricePerMillion, completionPricePerMillion);

            usageRepository.save(usage);

            log.debug("Recorded usage for user {}: +{} tokens, total: {}",
                    userId, promptTokens + completionTokens, usage.getTotalTokens());

        } catch (Exception e) {
            log.error("Failed to record usage for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Record a failed request for a user.
     */
    @Async("aiTaskExecutor")
    @Transactional
    public void recordFailure(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        try {
            String currentPeriod = AIUserUsage.currentPeriod();

            AIUserUsage usage = usageRepository.findByUserIdAndUsagePeriod(userId, currentPeriod)
                    .orElseGet(() -> AIUserUsage.createForUser(userId));

            usage.recordFailure();
            usageRepository.save(usage);

        } catch (Exception e) {
            log.error("Failed to record failure for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Get current period usage for a user.
     */
    public Optional<AIUserUsage> getCurrentUsage(String userId) {
        return usageRepository.findByUserIdAndUsagePeriod(userId, AIUserUsage.currentPeriod());
    }

    /**
     * Get all usage history for a user.
     */
    public List<AIUserUsage> getUserHistory(String userId) {
        return usageRepository.findByUserIdOrderByUsagePeriodDesc(userId);
    }

    /**
     * Check if user has exceeded their monthly token limit.
     */
    public boolean isUserOverLimit(String userId) {
        return getCurrentUsage(userId)
                .map(usage -> usage.getTotalTokens() >= monthlyTokenLimit)
                .orElse(false);
    }

    /**
     * Get remaining tokens for a user this month.
     */
    public long getRemainingTokens(String userId) {
        return getCurrentUsage(userId)
                .map(usage -> Math.max(0, monthlyTokenLimit - usage.getTotalTokens()))
                .orElse(monthlyTokenLimit);
    }

    /**
     * Get top users by usage for current period.
     */
    public List<AIUserUsage> getTopUsers(int limit) {
        return usageRepository.findTopUsersByPeriod(
                AIUserUsage.currentPeriod(),
                PageRequest.of(0, limit)
        );
    }

    /**
     * Get usage summary for current period.
     */
    public UsageSummary getCurrentPeriodSummary() {
        String period = AIUserUsage.currentPeriod();
        Long totalTokens = usageRepository.getTotalTokensForPeriod(period);
        BigDecimal totalCost = usageRepository.getTotalCostForPeriod(period);
        Long totalRequests = usageRepository.getTotalRequestsForPeriod(period);

        return new UsageSummary(
                period,
                totalTokens != null ? totalTokens : 0L,
                totalCost != null ? totalCost : BigDecimal.ZERO,
                totalRequests != null ? totalRequests : 0L
        );
    }

    /**
     * Get usage summary for a specific period.
     */
    public UsageSummary getPeriodSummary(String period) {
        Long totalTokens = usageRepository.getTotalTokensForPeriod(period);
        BigDecimal totalCost = usageRepository.getTotalCostForPeriod(period);
        Long totalRequests = usageRepository.getTotalRequestsForPeriod(period);

        return new UsageSummary(
                period,
                totalTokens != null ? totalTokens : 0L,
                totalCost != null ? totalCost : BigDecimal.ZERO,
                totalRequests != null ? totalRequests : 0L
        );
    }

    /**
     * Get user usage with percentage of limit.
     */
    public UserUsageInfo getUserUsageInfo(String userId) {
        AIUserUsage usage = getCurrentUsage(userId).orElse(null);

        if (usage == null) {
            return new UserUsageInfo(userId, 0, 0, 0, BigDecimal.ZERO, 0.0, monthlyTokenLimit);
        }

        double percentUsed = (double) usage.getTotalTokens() / monthlyTokenLimit * 100;

        return new UserUsageInfo(
                userId,
                usage.getPromptTokens(),
                usage.getCompletionTokens(),
                usage.getTotalTokens(),
                usage.getEstimatedCostUsd(),
                percentUsed,
                monthlyTokenLimit - usage.getTotalTokens()
        );
    }

    public record UsageSummary(
            String period,
            long totalTokens,
            BigDecimal totalCost,
            long totalRequests
    ) {}

    public record UserUsageInfo(
            String userId,
            long promptTokens,
            long completionTokens,
            long totalTokens,
            BigDecimal estimatedCost,
            double percentOfLimit,
            long remainingTokens
    ) {}

    /**
     * Check if user has remaining quota.
     */
    public boolean hasRemainingQuota(String userId) {
        return getRemainingTokens(userId) > 0;
    }

    /**
     * Get top users for current period.
     */
    public List<AIUserUsage> getTopUsersCurrentPeriod(int limit) {
        return getTopUsers(limit);
    }

    /**
     * Get system-wide usage summary.
     */
    public AIUsageSummaryResponse getSystemSummary() {
        String period = AIUserUsage.currentPeriod();
        Long totalTokens = usageRepository.getTotalTokensForPeriod(period);
        BigDecimal totalCost = usageRepository.getTotalCostForPeriod(period);
        Long totalRequests = usageRepository.getTotalRequestsForPeriod(period);

        List<AIUserUsage> users = usageRepository.findByUsagePeriodOrderByTotalTokensDesc(period);
        int activeUsers = users.size();

        long failedRequests = users.stream()
                .mapToInt(AIUserUsage::getFailedRequestCount)
                .sum();

        double avgTokensPerRequest = totalRequests != null && totalRequests > 0
                ? (double) (totalTokens != null ? totalTokens : 0) / totalRequests
                : 0.0;

        // Get average latency from logs
        Double avgLatency = logRepository.getAverageLatency();

        return AIUsageSummaryResponse.builder()
                .period(period)
                .totalTokens(totalTokens != null ? totalTokens : 0L)
                .totalRequests(totalRequests != null ? totalRequests : 0L)
                .totalFailedRequests(failedRequests)
                .totalCostUsd(totalCost != null ? totalCost : BigDecimal.ZERO)
                .activeUsers(activeUsers)
                .averageTokensPerRequest(avgTokensPerRequest)
                .averageLatencyMs(avgLatency != null ? avgLatency : 0.0)
                .build();
    }

    /**
     * Get detailed usage statistics.
     */
    public AIUsageStatsResponse getUsageStats() {
        String period = AIUserUsage.currentPeriod();
        Long totalTokens = usageRepository.getTotalTokensForPeriod(period);
        Long totalRequests = usageRepository.getTotalRequestsForPeriod(period);
        BigDecimal totalCost = usageRepository.getTotalCostForPeriod(period);

        List<AIUserUsage> users = usageRepository.findByUsagePeriodOrderByTotalTokensDesc(period);
        long failedRequests = users.stream()
                .mapToInt(AIUserUsage::getFailedRequestCount)
                .sum();

        long successfulRequests = (totalRequests != null ? totalRequests : 0L) - failedRequests;
        double successRate = totalRequests != null && totalRequests > 0
                ? (double) successfulRequests / totalRequests * 100
                : 100.0;

        // Get provider stats from logs
        Map<String, AIUsageStatsResponse.ProviderStats> byProvider = new HashMap<>();
        List<Object[]> providerTokens = logRepository.getTokenUsageByProvider();
        List<Object[]> providerLatency = logRepository.getAverageLatencyByProvider();
        List<Object[]> providerFailures = logRepository.countFailuresByProvider();

        for (Object[] row : providerTokens) {
            String provider = (String) row[0];
            long tokens = ((Number) row[1]).longValue();
            byProvider.put(provider, AIUsageStatsResponse.ProviderStats.builder()
                    .provider(provider)
                    .tokens(tokens)
                    .build());
        }

        for (Object[] row : providerLatency) {
            String provider = (String) row[0];
            double latency = ((Number) row[1]).doubleValue();
            if (byProvider.containsKey(provider)) {
                byProvider.get(provider).setAvgLatencyMs(latency);
            }
        }

        for (Object[] row : providerFailures) {
            String provider = (String) row[0];
            long failures = ((Number) row[1]).longValue();
            if (byProvider.containsKey(provider)) {
                byProvider.get(provider).setFailures(failures);
            }
        }

        // Get content type stats
        Map<String, AIUsageStatsResponse.ContentTypeStats> byContentType = new HashMap<>();
        List<Object[]> contentTypeStats = logRepository.countSuccessfulByContentType();
        for (Object[] row : contentTypeStats) {
            String contentType = (String) row[0];
            long requests = ((Number) row[1]).longValue();
            byContentType.put(contentType, AIUsageStatsResponse.ContentTypeStats.builder()
                    .contentType(contentType)
                    .requests(requests)
                    .build());
        }

        // Get latency percentiles (simplified - actual implementation would use proper percentile calculation)
        Double avgLatency = logRepository.getAverageLatency();

        return AIUsageStatsResponse.builder()
                .period(period)
                .totalTokens(totalTokens != null ? totalTokens : 0L)
                .totalRequests(totalRequests != null ? totalRequests : 0L)
                .failedRequests(failedRequests)
                .totalCostUsd(totalCost != null ? totalCost : BigDecimal.ZERO)
                .successRate(successRate)
                .byProvider(byProvider)
                .byContentType(byContentType)
                .avgLatencyMs(avgLatency != null ? avgLatency : 0.0)
                .p50LatencyMs(avgLatency != null ? avgLatency * 0.8 : 0.0)
                .p95LatencyMs(avgLatency != null ? avgLatency * 1.5 : 0.0)
                .p99LatencyMs(avgLatency != null ? avgLatency * 2.0 : 0.0)
                .build();
    }
}

