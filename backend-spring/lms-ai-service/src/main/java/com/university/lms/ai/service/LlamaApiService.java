package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.config.LlamaApiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.Map;

/**
 * Service for communicating with Llama API
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlamaApiService {

    private final WebClient llamaWebClient;
    private final LlamaApiProperties llamaApiProperties;
    private final ObjectMapper objectMapper;

    /**
     * Generate text using Llama API
     *
     * @param prompt The prompt to send to Llama
     * @param systemPrompt Optional system prompt for context
     * @return Generated text response
     */
    public String generate(String prompt, String systemPrompt) {
        log.info("Sending generation request to Llama API");

        Map<String, Object> requestBody = Map.of(
            "model", llamaApiProperties.getModel(),
            "prompt", prompt,
            "system", systemPrompt != null ? systemPrompt : "",
            "stream", false,
            "options", Map.of(
                "temperature", 0.7,
                "top_p", 0.9,
                "top_k", 40
            )
        );

        try {
            String response = llamaWebClient.post()
                    .uri("/api/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(llamaApiProperties.getMaxRetries(), Duration.ofSeconds(2))
                            .maxBackoff(Duration.ofSeconds(10))
                            .doBeforeRetry(retrySignal ->
                                log.warn("Retrying Llama API call. Attempt: {}", retrySignal.totalRetries() + 1)))
                    .block();

            // Parse response to extract generated text
            JsonNode jsonNode = objectMapper.readTree(response);
            String generatedText = jsonNode.get("response").asText();

            log.info("Successfully received response from Llama API");
            return generatedText;

        } catch (Exception e) {
            log.error("Error calling Llama API", e);
            throw new RuntimeException("Failed to generate content with Llama API: " + e.getMessage(), e);
        }
    }

    /**
     * Generate text with JSON format constraint
     *
     * @param prompt The prompt to send
     * @param systemPrompt System prompt with JSON format instructions
     * @return Generated JSON text
     */
    public String generateJson(String prompt, String systemPrompt) {
        String jsonSystemPrompt = systemPrompt + "\n\nIMPORTANT: You must respond ONLY with valid JSON. No additional text or explanations.";
        return generate(prompt, jsonSystemPrompt);
    }
}

