package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.config.LlamaApiProperties;
import com.university.lms.ai.exception.AIServiceUnavailableException;
import com.university.lms.ai.infrastructure.metrics.AIMetricsCollector;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Service for communicating with Llama API (via Groq). Includes circuit breaker, retry, and
 * observability.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlamaApiService {

  private final WebClient llamaWebClient;
  private final LlamaApiProperties llamaApiProperties;
  private final ObjectMapper objectMapper;
  private final AIMetricsCollector metricsCollector;

  private static final String PROVIDER_NAME = "groq";
  private static final String CIRCUIT_BREAKER_NAME = "llamaApi";

  /**
   * Generate text using Llama API with resilience patterns.
   *
   * @param prompt The prompt to send to Llama
   * @param systemPrompt Optional system prompt for context
   * @return Generated text response
   */
  @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "generateFallback")
  @Retry(name = CIRCUIT_BREAKER_NAME)
  public String generate(String prompt, String systemPrompt) {
    log.info("Sending generation request to Llama API (Groq)");

    long startTime = System.currentTimeMillis();
    boolean success = false;

    try {
      String result = doGenerate(prompt, systemPrompt);
      success = true;
      return result;
    } finally {
      long latencyMs = System.currentTimeMillis() - startTime;
      metricsCollector.recordGeneration("text", PROVIDER_NAME, latencyMs, success);
    }
  }

  /** Internal method that performs the actual API call. */
  private String doGenerate(String prompt, String systemPrompt) {
    // Build messages array for OpenAI-compatible API
    var messages = new java.util.ArrayList<Map<String, String>>();
    if (systemPrompt != null && !systemPrompt.isEmpty()) {
      messages.add(Map.of("role", "system", "content", systemPrompt));
    }
    messages.add(Map.of("role", "user", "content", prompt));

    Map<String, Object> requestBody =
        Map.of(
            "model",
            llamaApiProperties.getModel(),
            "messages",
            messages,
            "temperature",
            0.7,
            "max_tokens",
            4000,
            "top_p",
            0.9,
            "stream",
            false);

    try {
      String response =
          llamaWebClient
              .post()
              .uri("/chat/completions")
              .contentType(MediaType.APPLICATION_JSON)
              .bodyValue(requestBody)
              .retrieve()
              .bodyToMono(String.class)
              .timeout(Duration.ofSeconds(60))
              .block();

      if (response == null || response.isBlank()) {
        throw new AIServiceUnavailableException("Llama API returned an empty response");
      }

      // Parse OpenAI-compatible response
      JsonNode jsonNode = objectMapper.readTree(response);

      // Extract token usage if available
      if (jsonNode.has("usage")) {
        JsonNode usage = jsonNode.get("usage");
        int promptTokens = usage.has("prompt_tokens") ? usage.get("prompt_tokens").asInt() : 0;
        int completionTokens =
            usage.has("completion_tokens") ? usage.get("completion_tokens").asInt() : 0;
        metricsCollector.recordTokenUsage(PROVIDER_NAME, promptTokens, completionTokens);
      }

      String generatedText = jsonNode.get("choices").get(0).get("message").get("content").asText();

      log.info("Successfully received response from Llama API");
      return generatedText;

    } catch (Exception e) {
      log.error("Error calling Llama API", e);
      throw new RuntimeException("Failed to generate content with Llama API: " + e.getMessage(), e);
    }
  }

  /** Fallback method when circuit breaker is open or retries exhausted. */
  public String generateFallback(String prompt, String systemPrompt, Exception e) {
    log.warn("Circuit breaker fallback triggered for Llama API", e);
    metricsCollector.recordFallback(PROVIDER_NAME, "circuit_breaker");

    throw new AIServiceUnavailableException(
        "AI service temporarily unavailable. Please try again later.", e);
  }

  /**
   * Async generation with CompletableFuture for non-blocking calls.
   *
   * @param prompt The prompt to send
   * @param systemPrompt System prompt for context
   * @return CompletableFuture containing the generated text
   */
  @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "generateAsyncFallback")
  @TimeLimiter(name = CIRCUIT_BREAKER_NAME)
  public CompletableFuture<String> generateAsync(String prompt, String systemPrompt) {
    return CompletableFuture.supplyAsync(() -> generate(prompt, systemPrompt));
  }

  /** Async fallback method. */
  public CompletableFuture<String> generateAsyncFallback(
      String prompt, String systemPrompt, Exception e) {
    log.warn("Async circuit breaker fallback triggered for Llama API", e);
    metricsCollector.recordFallback(PROVIDER_NAME, "async_circuit_breaker");

    return CompletableFuture.failedFuture(
        new AIServiceUnavailableException(
            "AI service temporarily unavailable. Please try again later.", e));
  }

  /**
   * Generate text with JSON format constraint.
   *
   * @param prompt The prompt to send
   * @param systemPrompt System prompt with JSON format instructions
   * @return Generated JSON text
   */
  public String generateJson(String prompt, String systemPrompt) {
    String basePrompt = systemPrompt == null ? "" : systemPrompt;
    String jsonSystemPrompt =
        basePrompt
            + "\n\nIMPORTANT: You must respond ONLY with valid JSON. No additional text or explanations.";
    return generate(prompt, jsonSystemPrompt);
  }
}
