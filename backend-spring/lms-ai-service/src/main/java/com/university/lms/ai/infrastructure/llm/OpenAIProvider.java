package com.university.lms.ai.infrastructure.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * LLM Provider implementation for OpenAI API. Secondary fallback provider. DISABLED - Only Groq is
 * used as the LLM provider.
 */
// @Component - Disabled to use only Groq provider
@Slf4j
public class OpenAIProvider implements LLMProvider {

  private static final String PROVIDER_NAME = "openai";
  private static final int PRIORITY = 2; // Secondary priority (fallback)
  private static final String OPENAI_API_URL = "https://api.openai.com/v1";

  private final WebClient webClient;
  private final ObjectMapper objectMapper;
  private final String apiKey;
  private final String defaultModel;

  public OpenAIProvider(
      ObjectMapper objectMapper,
      @Value("${openai.api.key:}") String apiKey,
      @Value("${openai.model:gpt-4o-mini}") String defaultModel) {

    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;

    this.webClient =
        WebClient.builder()
            .baseUrl(OPENAI_API_URL)
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();

    if (isAvailable()) {
      log.info("OpenAI provider initialized with model: {}", defaultModel);
    } else {
      log.warn("OpenAI provider not configured (missing API key)");
    }
  }

  @Override
  public String getName() {
    return PROVIDER_NAME;
  }

  @Override
  public int getPriority() {
    return PRIORITY;
  }

  @Override
  public boolean isAvailable() {
    return StringUtils.hasText(apiKey);
  }

  @Override
  public LLMResponse generate(String prompt, String systemPrompt, LLMGenerationOptions options) {
    if (!isAvailable()) {
      throw new LLMProviderException(PROVIDER_NAME, "OpenAI API key not configured");
    }

    log.debug("Generating content with OpenAI provider, type: {}", options.getGenerationType());
    long startTime = System.currentTimeMillis();

    try {
      // Build messages array for OpenAI API
      var messages = new ArrayList<Map<String, String>>();
      if (StringUtils.hasText(systemPrompt)) {
        messages.add(Map.of("role", "system", "content", systemPrompt));
      }
      messages.add(Map.of("role", "user", "content", prompt));

      String model = options.getModel() != null ? options.getModel() : defaultModel;

      Map<String, Object> requestBody =
          Map.of(
              "model", model,
              "messages", messages,
              "temperature", options.getTemperature(),
              "max_tokens", options.getMaxTokens(),
              "top_p", options.getTopP());

      String response =
          webClient
              .post()
              .uri("/chat/completions")
              .bodyValue(requestBody)
              .retrieve()
              .bodyToMono(String.class)
              .timeout(Duration.ofSeconds(120))
              .block();

      return parseResponse(response, startTime, model);

    } catch (WebClientResponseException e) {
      log.error("OpenAI API HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());

      // Check for rate limiting
      if (e.getStatusCode().value() == 429) {
        throw new LLMProviderException(PROVIDER_NAME, "OpenAI rate limit exceeded", e, true);
      }

      throw new LLMProviderException(PROVIDER_NAME, "OpenAI API error: " + e.getStatusCode(), e);
    } catch (Exception e) {
      log.error("OpenAI generation failed", e);
      throw new LLMProviderException(
          PROVIDER_NAME, "Failed to generate with OpenAI: " + e.getMessage(), e);
    }
  }

  private LLMResponse parseResponse(String response, long startTime, String model) {
    try {
      JsonNode jsonNode = objectMapper.readTree(response);

      // Extract content
      String content = jsonNode.path("choices").get(0).path("message").path("content").asText();

      // Extract token usage
      JsonNode usage = jsonNode.path("usage");
      int promptTokens = usage.path("prompt_tokens").asInt(0);
      int completionTokens = usage.path("completion_tokens").asInt(0);

      long latencyMs = System.currentTimeMillis() - startTime;

      return LLMResponse.builder()
          .content(content)
          .provider(PROVIDER_NAME)
          .model(model)
          .promptTokens(promptTokens)
          .completionTokens(completionTokens)
          .totalTokens(promptTokens + completionTokens)
          .latencyMs(latencyMs)
          .build();

    } catch (Exception e) {
      throw new LLMProviderException(PROVIDER_NAME, "Failed to parse OpenAI response", e);
    }
  }
}
