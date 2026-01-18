package com.university.lms.ai.service;

import com.university.lms.ai.domain.entity.PromptABTest;
import com.university.lms.ai.domain.entity.PromptTemplate;
import com.university.lms.ai.dto.ABTestResultsResponse;
import com.university.lms.ai.dto.ABTestVariantStats;
import com.university.lms.ai.repository.PromptABTestRepository;
import com.university.lms.ai.repository.PromptTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing A/B tests on prompt templates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromptABTestService {

    private final PromptABTestRepository abTestRepository;
    private final PromptTemplateRepository templateRepository;
    private final SecureRandom random = new SecureRandom();

    // Active experiments: experimentName -> List of variant template names
    private final Map<String, List<String>> activeExperiments = new HashMap<>();

    // Traffic allocation: experimentName -> variant weights
    private final Map<String, Map<String, Integer>> trafficAllocation = new HashMap<>();

    /**
     * Register a new A/B test experiment.
     *
     * @param experimentName Unique experiment identifier
     * @param variants       Map of variant name to template name
     * @param weights        Map of variant name to traffic weight (must sum to 100)
     */
    public void registerExperiment(String experimentName,
                                   Map<String, String> variants,
                                   Map<String, Integer> weights) {
        // Validate templates exist
        for (String templateName : variants.values()) {
            if (!templateRepository.existsByName(templateName)) {
                throw new IllegalArgumentException("Template not found: " + templateName);
            }
        }

        // Validate weights sum to 100
        int totalWeight = weights.values().stream().mapToInt(Integer::intValue).sum();
        if (totalWeight != 100) {
            throw new IllegalArgumentException("Weights must sum to 100, got: " + totalWeight);
        }

        activeExperiments.put(experimentName, new ArrayList<>(variants.values()));
        trafficAllocation.put(experimentName, new HashMap<>(weights));

        log.info("Registered A/B test experiment: {} with variants: {}", experimentName, variants);
    }

    /**
     * Get the template name to use for a given experiment.
     * Selects variant based on traffic allocation.
     *
     * @param experimentName Experiment identifier
     * @param userId         User ID for consistent assignment
     * @return Selected template name
     */
    public String selectVariant(String experimentName, String userId) {
        if (!activeExperiments.containsKey(experimentName)) {
            throw new IllegalArgumentException("Experiment not found: " + experimentName);
        }

        Map<String, Integer> weights = trafficAllocation.get(experimentName);

        // Use consistent hashing for user assignment
        int userHash = Math.abs((userId + experimentName).hashCode() % 100);

        int cumulative = 0;
        for (Map.Entry<String, Integer> entry : weights.entrySet()) {
            cumulative += entry.getValue();
            if (userHash < cumulative) {
                return entry.getKey();
            }
        }

        // Fallback to first variant
        return weights.keySet().iterator().next();
    }

    /**
     * Get the template for a variant.
     */
    public Optional<PromptTemplate> getVariantTemplate(String experimentName, String variantName) {
        if (!activeExperiments.containsKey(experimentName)) {
            return Optional.empty();
        }

        List<String> variants = activeExperiments.get(experimentName);
        if (!variants.contains(variantName)) {
            return Optional.empty();
        }

        return templateRepository.findByName(variantName);
    }

    /**
     * Record an A/B test result.
     */
    @Transactional
    public void recordResult(String experimentName, String variantName,
                            String promptTemplateName, String userId,
                            boolean success, Long latencyMs, Integer totalTokens,
                            Integer qualityScore, Integer userRating) {
        PromptABTest result = PromptABTest.builder()
                .experimentName(experimentName)
                .variantName(variantName)
                .promptTemplateName(promptTemplateName)
                .userId(userId)
                .success(success)
                .latencyMs(latencyMs)
                .totalTokens(totalTokens)
                .qualityScore(qualityScore)
                .userRating(userRating)
                .build();

        abTestRepository.save(result);
        log.debug("Recorded A/B test result: experiment={}, variant={}, success={}",
                experimentName, variantName, success);
    }

    /**
     * Record user rating for an experiment result.
     */
    @Transactional
    public void recordUserRating(String resultId, int rating) {
        abTestRepository.findById(resultId).ifPresent(result -> {
            result.setUserRating(rating);
            abTestRepository.save(result);
            log.debug("Updated user rating for result: {}", resultId);
        });
    }

    /**
     * Get results for an experiment.
     */
    public ABTestResultsResponse getResults(String experimentName) {
        List<PromptABTest> allResults = abTestRepository.findByExperimentNameOrderByCreatedAtDesc(experimentName);

        if (allResults.isEmpty()) {
            return ABTestResultsResponse.builder()
                    .experimentName(experimentName)
                    .totalSamples(0)
                    .variants(Collections.emptyList())
                    .build();
        }

        // Group by variant
        Map<String, List<PromptABTest>> byVariant = allResults.stream()
                .collect(Collectors.groupingBy(PromptABTest::getVariantName));

        List<ABTestVariantStats> variantStats = byVariant.entrySet().stream()
                .map(entry -> calculateVariantStats(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(ABTestVariantStats::getSuccessRate).reversed())
                .toList();

        // Determine winner (variant with highest success rate and significant sample size)
        String winningVariant = variantStats.stream()
                .filter(v -> v.getSampleSize() >= 30) // Minimum sample size
                .max(Comparator.comparing(ABTestVariantStats::getSuccessRate))
                .map(ABTestVariantStats::getVariantName)
                .orElse(null);

        return ABTestResultsResponse.builder()
                .experimentName(experimentName)
                .totalSamples(allResults.size())
                .variants(variantStats)
                .winningVariant(winningVariant)
                .statisticallySignificant(isStatisticallySignificant(variantStats))
                .build();
    }

    private ABTestVariantStats calculateVariantStats(String variantName, List<PromptABTest> results) {
        long successCount = results.stream().filter(PromptABTest::isSuccess).count();
        double successRate = results.isEmpty() ? 0 : (double) successCount / results.size() * 100;

        OptionalDouble avgLatency = results.stream()
                .filter(r -> r.getLatencyMs() != null)
                .mapToLong(PromptABTest::getLatencyMs)
                .average();

        OptionalDouble avgQuality = results.stream()
                .filter(r -> r.getQualityScore() != null)
                .mapToInt(PromptABTest::getQualityScore)
                .average();

        OptionalDouble avgRating = results.stream()
                .filter(r -> r.getUserRating() != null)
                .mapToInt(PromptABTest::getUserRating)
                .average();

        long totalTokens = results.stream()
                .filter(r -> r.getTotalTokens() != null)
                .mapToInt(PromptABTest::getTotalTokens)
                .sum();

        return ABTestVariantStats.builder()
                .variantName(variantName)
                .sampleSize(results.size())
                .successCount((int) successCount)
                .successRate(successRate)
                .averageLatencyMs(avgLatency.orElse(0))
                .averageQualityScore(avgQuality.orElse(0))
                .averageUserRating(avgRating.orElse(0))
                .totalTokens(totalTokens)
                .build();
    }

    private boolean isStatisticallySignificant(List<ABTestVariantStats> variants) {
        // Simplified significance check - in production, use proper statistical tests
        if (variants.size() < 2) return false;

        int minSamples = variants.stream().mapToInt(ABTestVariantStats::getSampleSize).min().orElse(0);
        if (minSamples < 30) return false;

        double maxRate = variants.stream().mapToDouble(ABTestVariantStats::getSuccessRate).max().orElse(0);
        double minRate = variants.stream().mapToDouble(ABTestVariantStats::getSuccessRate).min().orElse(0);

        // Consider significant if difference > 5%
        return (maxRate - minRate) > 5.0;
    }

    /**
     * Get all active experiment names.
     */
    public Set<String> getActiveExperiments() {
        return activeExperiments.keySet();
    }

    /**
     * Get all experiment names from database.
     */
    public List<String> getAllExperimentNames() {
        return abTestRepository.findAllExperimentNames();
    }

    /**
     * Stop an experiment.
     */
    public void stopExperiment(String experimentName) {
        activeExperiments.remove(experimentName);
        trafficAllocation.remove(experimentName);
        log.info("Stopped A/B test experiment: {}", experimentName);
    }
}

