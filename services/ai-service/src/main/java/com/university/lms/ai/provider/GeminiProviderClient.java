package com.university.lms.ai.provider;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.exception.AiOutputInvalidException;
import com.university.lms.ai.service.AiProviderConfigService;
import com.university.lms.ai.service.AiOutputSanitizer;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class GeminiProviderClient {

    private static final String GEMINI_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AiProviderConfigService configService;

    public GeminiProviderClient(AiProviderConfigService configService, ObjectMapper objectMapper) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
        this.configService = configService;
    }

    public JsonNode generateContent(String apiKey, String prompt, String systemPrompt, Map<String, Object> jsonSchema) {
        GeminiRequest requestBody = GeminiRequest.of(prompt, systemPrompt, jsonSchema);

        String generatedText = null;
        try {
            GeminiResponse response = executeRequest(apiKey, requestBody);

            generatedText = response.extractText();
            if (generatedText == null || generatedText.isBlank()) {
                throw new AiException(AiErrorCode.AI_PROVIDER_UNAVAILABLE, "No generated text found in Gemini response");
            }

            return objectMapper.readTree(generatedText);

        } catch (JsonProcessingException e) {
            throw new AiOutputInvalidException(
                    "provider.output expected JSON object actual unparsable JSON",
                    AiOutputSanitizer.rawOutputJson(generatedText, objectMapper),
                    e);
        } catch (Exception e) {
            if (e instanceof AiException) throw (AiException) e;
            throw new AiOutputInvalidException(
                    "provider.output expected JSON object actual unparsable JSON",
                    AiOutputSanitizer.rawOutputJson(generatedText, objectMapper),
                    e);
        }
    }

    public void testConnection(String apiKey) {
        GeminiResponse response = executeRequest(
                apiKey,
                GeminiRequest.of(
                        "Return exactly this JSON object: {\"ok\":true}",
                        "You are a health check. Return only valid JSON matching the schema.",
                        Map.of(
                                "type", "object",
                                "required", java.util.List.of("ok"),
                                "properties", Map.of("ok", Map.of("type", "boolean"))
                        )
                )
        );
        String generatedText = response.extractText();
        if (generatedText == null || generatedText.isBlank()) {
            throw new AiException(AiErrorCode.AI_PROVIDER_UNAVAILABLE, "No generated text found in Gemini response");
        }
    }

    private GeminiResponse executeRequest(String apiKey, GeminiRequest requestBody) {
        String model = configService.getGeminiModel();
        String url = String.format(GEMINI_API_URL_TEMPLATE, model, apiKey);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestBody, headers);

        try {
            GeminiResponse response = restTemplate.postForObject(url, entity, GeminiResponse.class);
            if (response == null) {
                throw new AiException(AiErrorCode.AI_PROVIDER_UNAVAILABLE, "Empty response from Gemini API");
            }
            return response;
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            throw new AiException(AiErrorCode.AI_PROVIDER_AUTH_FAILED, "Gemini API key is invalid or unauthorized", e);
        } catch (HttpClientErrorException.BadRequest e) {
            String body = e.getResponseBodyAsString();
            if (body != null && body.toLowerCase().contains("api_key_invalid")) {
                throw new AiException(AiErrorCode.AI_PROVIDER_AUTH_FAILED, "Gemini API key is invalid or unauthorized", e);
            }
            throw new AiException(AiErrorCode.AI_PROVIDER_UNAVAILABLE, "Gemini API error: " + e.getStatusCode(), e);
        } catch (HttpClientErrorException.TooManyRequests e) {
            throw new AiException(AiErrorCode.AI_PROVIDER_RATE_LIMITED, "Gemini API rate limit exceeded", e);
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            throw new AiException(AiErrorCode.AI_PROVIDER_UNAVAILABLE, "Gemini API error: " + e.getStatusCode(), e);
        }
    }
}
