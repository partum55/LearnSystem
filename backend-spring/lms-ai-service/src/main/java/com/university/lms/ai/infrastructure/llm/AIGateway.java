package com.university.lms.ai.infrastructure.llm;

import com.university.lms.ai.exception.AIServiceUnavailableException;
import com.university.lms.ai.infrastructure.metrics.AIMetricsCollector;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Central gateway for all LLM operations.
 * Provides multi-provider routing with automatic failover and circuit breaker protection.
 */
@Service
@Slf4j
public class AIGateway {

    private final List<LLMProvider> providers;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final AIMetricsCollector metricsCollector;

    public AIGateway(List<LLMProvider> providers,
                     CircuitBreakerRegistry circuitBreakerRegistry,
                     AIMetricsCollector metricsCollector) {
        this.providers = providers;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
        this.metricsCollector = metricsCollector;

        log.info("AIGateway initialized with {} providers: {}",
                providers.size(),
                providers.stream().map(LLMProvider::getName).collect(Collectors.joining(", ")));
    }

    /**
     * Generate text using available providers with automatic failover.
     *
     * @param prompt       User prompt
     * @param systemPrompt System prompt for context
     * @param options      Generation options
     * @return Generated response
     * @throws AIServiceUnavailableException if all providers fail
     */
    public LLMResponse generate(String prompt, String systemPrompt, LLMGenerationOptions options) {
        List<LLMProvider> orderedProviders = getOrderedProviders();

        if (orderedProviders.isEmpty()) {
            throw new AIServiceUnavailableException("No AI providers configured");
        }

        Exception lastException = null;

        for (LLMProvider provider : orderedProviders) {
            String providerName = provider.getName();

            if (!provider.isAvailable()) {
                log.debug("Provider {} is not available, skipping", providerName);
                continue;
            }

            CircuitBreaker circuitBreaker = getOrCreateCircuitBreaker(providerName);

            // Check if circuit breaker is open
            if (!circuitBreaker.tryAcquirePermission()) {
                log.warn("Circuit breaker is open for provider: {}", providerName);
                metricsCollector.recordCircuitBreakerOpen(providerName);
                continue;
            }

            try {
                log.info("Attempting generation with provider: {}", providerName);
                long startTime = System.currentTimeMillis();

                LLMResponse response = circuitBreaker.executeSupplier(() ->
                        provider.generate(prompt, systemPrompt, options)
                );

                // Record success metrics
                metricsCollector.recordGeneration(
                        options.getGenerationType(),
                        providerName,
                        response.getLatencyMs(),
                        true
                );
                metricsCollector.recordTokenUsage(
                        providerName,
                        response.getPromptTokens(),
                        response.getCompletionTokens()
                );

                log.info("Generation successful with provider: {}, latency: {}ms",
                        providerName, response.getLatencyMs());

                return response;

            } catch (Exception e) {
                lastException = e;
                log.warn("Provider {} failed, trying next. Error: {}", providerName, e.getMessage());

                metricsCollector.recordGeneration(
                        options.getGenerationType(),
                        providerName,
                        0,
                        false
                );
                metricsCollector.recordFallback(providerName, options.getGenerationType());
            }
        }

        // All providers failed
        log.error("All AI providers failed. Last error: {}",
                lastException != null ? lastException.getMessage() : "Unknown");

        throw new AIServiceUnavailableException(
                "All AI providers are currently unavailable. Please try again later.",
                lastException
        );
    }

    /**
     * Generate text with default options.
     */
    public LLMResponse generate(String prompt, String systemPrompt) {
        return generate(prompt, systemPrompt, LLMGenerationOptions.defaults());
    }

    /**
     * Generate text with just a prompt (no system prompt).
     */
    public LLMResponse generate(String prompt) {
        return generate(prompt, null, LLMGenerationOptions.defaults());
    }

    /**
     * Get list of providers ordered by priority (lowest first = highest priority).
     */
    private List<LLMProvider> getOrderedProviders() {
        return providers.stream()
                .sorted(Comparator.comparingInt(LLMProvider::getPriority))
                .collect(Collectors.toList());
    }

    /**
     * Get or create a circuit breaker for the given provider.
     */
    private CircuitBreaker getOrCreateCircuitBreaker(String providerName) {
        String cbName = "llm-" + providerName;
        return circuitBreakerRegistry.circuitBreaker(cbName);
    }

    /**
     * Get health status of all providers.
     */
    public List<ProviderStatus> getProvidersStatus() {
        return providers.stream()
                .map(provider -> {
                    CircuitBreaker cb = getOrCreateCircuitBreaker(provider.getName());
                    return new ProviderStatus(
                            provider.getName(),
                            provider.getPriority(),
                            provider.isAvailable(),
                            cb.getState().name(),
                            provider.getHealth().name()
                    );
                })
                .sorted(Comparator.comparingInt(ProviderStatus::priority))
                .collect(Collectors.toList());
    }

    public record ProviderStatus(
            String name,
            int priority,
            boolean available,
            String circuitBreakerState,
            String health
    ) {}
}

