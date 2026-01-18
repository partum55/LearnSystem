package com.university.lms.ai.infrastructure.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.config.LlamaApiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Map;

/**
 * LLM Provider implementation for Groq API (OpenAI-compatible).
 * Primary provider with highest priority.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GroqProvider implements LLMProvider {

    private static final String PROVIDER_NAME = "groq";
    private static final int PRIORITY = 1; // Highest priority (primary)

    private final WebClient llamaWebClient;
    private final LlamaApiProperties llamaApiProperties;
    private final ObjectMapper objectMapper;

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
        return StringUtils.hasText(llamaApiProperties.getKey());
    }

    @Override
    public LLMResponse generate(String prompt, String systemPrompt, LLMGenerationOptions options) {
        if (!isAvailable()) {
            throw new LLMProviderException(PROVIDER_NAME, "Groq API key not configured");
        }

        log.debug("Generating content with Groq provider, type: {}", options.getGenerationType());
        long startTime = System.currentTimeMillis();

        try {
            // Build messages array for OpenAI-compatible API
            var messages = new ArrayList<Map<String, String>>();
            if (StringUtils.hasText(systemPrompt)) {
                messages.add(Map.of("role", "system", "content", systemPrompt));
            }
            messages.add(Map.of("role", "user", "content", prompt));

            String model = options.getModel() != null ? options.getModel() : llamaApiProperties.getModel();

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", messages,
                    "temperature", options.getTemperature(),
                    "max_tokens", options.getMaxTokens(),
                    "top_p", options.getTopP(),
                    "stream", false
            );

            String response = llamaWebClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(120))
                    .block();

            return parseResponse(response, startTime, model);

        } catch (WebClientResponseException e) {
            log.error("Groq API HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new LLMProviderException(PROVIDER_NAME,
                    "Groq API error: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("Groq generation failed", e);
            throw new LLMProviderException(PROVIDER_NAME,
                    "Failed to generate with Groq: " + e.getMessage(), e);
        }
    }

    private LLMResponse parseResponse(String response, long startTime, String model) {
        try {
            JsonNode jsonNode = objectMapper.readTree(response);

            // Extract content
            String content = jsonNode.path("choices").get(0)
                    .path("message").path("content").asText();

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
            throw new LLMProviderException(PROVIDER_NAME,
                    "Failed to parse Groq response", e);
        }
    }
}

