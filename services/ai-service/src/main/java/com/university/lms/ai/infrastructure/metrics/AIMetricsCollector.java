package com.university.lms.ai.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Centralized collector for AI service metrics. Exposes Prometheus-compatible metrics for: -
 * Generation latency - Token usage - Cache hit/miss rates - Provider health - Error rates
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AIMetricsCollector {

  private final MeterRegistry meterRegistry;

  private static final String METRIC_PREFIX = "ai_";

  /**
   * Records the duration of an AI generation request.
   *
   * @param type Type of generation (course, quiz, assignment, module)
   * @param provider LLM provider name (groq, openai, etc.)
   * @param latencyMs Latency in milliseconds
   * @param success Whether the request was successful
   */
  public void recordGeneration(String type, String provider, long latencyMs, boolean success) {
    Timer.builder(METRIC_PREFIX + "generation_duration")
        .tag("type", type)
        .tag("provider", provider)
        .tag("success", String.valueOf(success))
        .description("Duration of AI generation requests")
        .register(meterRegistry)
        .record(latencyMs, TimeUnit.MILLISECONDS);

    // Also increment counter for easier aggregation
    Counter.builder(METRIC_PREFIX + "generation_total")
        .tag("type", type)
        .tag("provider", provider)
        .tag("success", String.valueOf(success))
        .description("Total number of AI generation requests")
        .register(meterRegistry)
        .increment();

    log.debug(
        "Recorded AI generation metric: type={}, provider={}, latency={}ms, success={}",
        type,
        provider,
        latencyMs,
        success);
  }

  /**
   * Records token usage for an AI request.
   *
   * @param provider LLM provider name
   * @param promptTokens Number of tokens in the prompt
   * @param completionTokens Number of tokens in the completion
   */
  public void recordTokenUsage(String provider, int promptTokens, int completionTokens) {
    Counter.builder(METRIC_PREFIX + "tokens_prompt")
        .tag("provider", provider)
        .description("Total prompt tokens used")
        .register(meterRegistry)
        .increment(promptTokens);

    Counter.builder(METRIC_PREFIX + "tokens_completion")
        .tag("provider", provider)
        .description("Total completion tokens used")
        .register(meterRegistry)
        .increment(completionTokens);

    Counter.builder(METRIC_PREFIX + "tokens_total")
        .tag("provider", provider)
        .description("Total tokens used (prompt + completion)")
        .register(meterRegistry)
        .increment(promptTokens + completionTokens);

    log.debug(
        "Recorded token usage: provider={}, prompt={}, completion={}",
        provider,
        promptTokens,
        completionTokens);
  }

  /**
   * Records cache hit or miss for AI responses.
   *
   * @param type Type of cached content
   * @param hit Whether the cache was hit
   */
  public void recordCacheAccess(String type, boolean hit) {
    Counter.builder(METRIC_PREFIX + "cache")
        .tag("type", type)
        .tag("result", hit ? "hit" : "miss")
        .description("AI response cache access")
        .register(meterRegistry)
        .increment();
  }

  /**
   * Records a circuit breaker state change.
   *
   * @param provider LLM provider name
   * @param state New state (CLOSED, OPEN, HALF_OPEN)
   */
  public void recordCircuitBreakerState(String provider, String state) {
    Counter.builder(METRIC_PREFIX + "circuit_breaker_state_change")
        .tag("provider", provider)
        .tag("state", state)
        .description("Circuit breaker state transitions")
        .register(meterRegistry)
        .increment();
  }

  /**
   * Records when a circuit breaker is open and request is rejected.
   *
   * @param provider LLM provider name
   */
  public void recordCircuitBreakerOpen(String provider) {
    Counter.builder(METRIC_PREFIX + "circuit_breaker_rejected")
        .tag("provider", provider)
        .description("Requests rejected due to open circuit breaker")
        .register(meterRegistry)
        .increment();

    log.warn("Request rejected by circuit breaker: provider={}", provider);
  }

  /**
   * Records a fallback invocation.
   *
   * @param provider LLM provider that triggered fallback
   * @param reason Reason for fallback (circuit_open, timeout, error)
   */
  public void recordFallback(String provider, String reason) {
    Counter.builder(METRIC_PREFIX + "fallback")
        .tag("provider", provider)
        .tag("reason", reason)
        .description("AI fallback invocations")
        .register(meterRegistry)
        .increment();

    log.warn("AI fallback triggered: provider={}, reason={}", provider, reason);
  }

  /**
   * Records streaming event metrics.
   *
   * @param eventType Type of streaming event
   * @param success Whether the event was processed successfully
   */
  public void recordStreamingEvent(String eventType, boolean success) {
    Counter.builder(METRIC_PREFIX + "streaming_events")
        .tag("event_type", eventType)
        .tag("success", String.valueOf(success))
        .description("AI streaming events")
        .register(meterRegistry)
        .increment();
  }

  /**
   * Creates a timer sample for measuring operation duration.
   *
   * @return Timer.Sample for stopping later
   */
  public Timer.Sample startTimer() {
    return Timer.start(meterRegistry);
  }

  /**
   * Stops a timer sample and records the duration.
   *
   * @param sample The timer sample to stop
   * @param name Metric name
   * @param tags Tag key-value pairs
   */
  public void stopTimer(Timer.Sample sample, String name, String... tags) {
    Timer.Builder builder = Timer.builder(METRIC_PREFIX + name).description("Duration metric");

    for (int i = 0; i < tags.length - 1; i += 2) {
      builder.tag(tags[i], tags[i + 1]);
    }

    sample.stop(builder.register(meterRegistry));
  }
}
