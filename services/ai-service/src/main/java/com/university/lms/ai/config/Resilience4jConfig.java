package com.university.lms.ai.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Resilience4j configuration for AI service resilience patterns. Configures Circuit Breaker, Retry,
 * and Time Limiter for LLM API calls.
 */
@Configuration
@Slf4j
public class Resilience4jConfig {

  private static final String LLAMA_API = "llamaApi";

  /**
   * Circuit Breaker Registry with custom configuration for LLM API calls.
   *
   * <p>Configuration: - Failure rate threshold: 50% (opens circuit if 50% of calls fail) - Wait
   * duration in open state: 30 seconds - Permitted calls in half-open state: 3 - Sliding window
   * size: 10 calls
   */
  @Bean
  public CircuitBreakerRegistry circuitBreakerRegistry() {
    CircuitBreakerConfig llamaApiConfig =
        CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(3)
            .slidingWindowSize(10)
            .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
            .recordExceptions(Exception.class)
            .build();

    CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(llamaApiConfig);

    // Register circuit breaker with event logging
    registry
        .circuitBreaker(LLAMA_API)
        .getEventPublisher()
        .onStateTransition(
            event ->
                log.warn(
                    "Circuit Breaker '{}' state transition: {} -> {}",
                    LLAMA_API,
                    event.getStateTransition().getFromState(),
                    event.getStateTransition().getToState()))
        .onFailureRateExceeded(
            event ->
                log.error(
                    "Circuit Breaker '{}' failure rate exceeded: {}%",
                    LLAMA_API, event.getFailureRate()));

    log.info("Circuit Breaker Registry initialized with config for: {}", LLAMA_API);
    return registry;
  }

  /**
   * Retry Registry with exponential backoff for transient failures.
   *
   * <p>Configuration: - Max attempts: 3 - Wait duration: 2 seconds (exponential backoff)
   */
  @Bean
  public RetryRegistry retryRegistry() {
    RetryConfig llamaApiConfig =
        RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofSeconds(2))
            .retryExceptions(Exception.class)
            .build();

    RetryRegistry registry = RetryRegistry.of(llamaApiConfig);

    registry
        .retry(LLAMA_API)
        .getEventPublisher()
        .onRetry(
            event ->
                log.warn(
                    "Retry attempt {} for '{}': {}",
                    event.getNumberOfRetryAttempts(),
                    LLAMA_API,
                    event.getLastThrowable().getMessage()));

    log.info("Retry Registry initialized with config for: {}", LLAMA_API);
    return registry;
  }

  /**
   * Time Limiter Registry to prevent long-running LLM calls.
   *
   * <p>Configuration: - Timeout: 60 seconds (LLM generation can be slow) - Cancel running future:
   * true
   */
  @Bean
  public TimeLimiterRegistry timeLimiterRegistry() {
    TimeLimiterConfig llamaApiConfig =
        TimeLimiterConfig.custom()
            .timeoutDuration(Duration.ofSeconds(60))
            .cancelRunningFuture(true)
            .build();

    TimeLimiterRegistry registry = TimeLimiterRegistry.of(llamaApiConfig);

    log.info("Time Limiter Registry initialized with 60s timeout for: {}", LLAMA_API);
    return registry;
  }
}
