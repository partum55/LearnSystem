package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
public class PluginLearningServiceClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public PluginLearningServiceClient(
            @Value("${services.learning-service.url}") String learningServiceUrl,
            ObjectMapper objectMapper) {
        this.webClient = WebClient.builder()
                .baseUrl(learningServiceUrl)
                .build();
        this.objectMapper = objectMapper;
    }

    private String buildAuthorizationHeader(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            return authToken;
        }
        if (authToken.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return authToken;
        }
        return "Bearer " + authToken;
    }

    public String getPluginInfo(String pluginId, String authToken) {
        return webClient.get()
                .uri("/api/plugins/{pluginId}", pluginId)
                .header("Authorization", buildAuthorizationHeader(authToken))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorReturn("{}")
                .block();
    }

    public Map<String, String> getPluginConfig(String pluginId, String authToken) {
        try {
            String response = webClient.get()
                    .uri("/api/plugins/{pluginId}/config", pluginId)
                    .header("Authorization", buildAuthorizationHeader(authToken))
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                if (root.has("config")) {
                    return objectMapper.convertValue(root.get("config"),
                            objectMapper.getTypeFactory().constructMapType(Map.class, String.class, String.class));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch config for plugin '{}': {}", pluginId, e.getMessage());
        }
        return Map.of();
    }

    public String getPluginLogs(String pluginId, int logLines, String authToken) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/plugins/{pluginId}/logs")
                        .queryParam("size", logLines)
                        .build(pluginId))
                .header("Authorization", buildAuthorizationHeader(authToken))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorReturn("[]")
                .block();
    }
}
