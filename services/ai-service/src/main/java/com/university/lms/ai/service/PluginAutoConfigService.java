package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.plugin.PluginConfigSuggestionRequest;
import com.university.lms.ai.dto.plugin.PluginConfigSuggestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PluginAutoConfigService {

    private final LlamaApiService llamaApiService;
    private final PluginLearningServiceClient learningServiceClient;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
        You are an expert at configuring Python sidecar plugins for a Learning Management System.
        Given the current plugin info, its current configuration, and the admin's goal,
        suggest optimal configuration values.

        Respond with JSON:
        {
          "suggestedConfig": {"key1": "value1", "key2": "value2"},
          "reasoning": "explanation of why these config values are optimal for the stated goal"
        }
        """;

    public PluginConfigSuggestionResponse suggestConfig(String pluginId,
                                                         PluginConfigSuggestionRequest request,
                                                         String authToken) {
        log.info("Suggesting config for plugin '{}'", pluginId);

        String pluginInfo = learningServiceClient.getPluginInfo(pluginId, authToken);
        Map<String, String> currentConfig = request.currentConfig() != null
                ? request.currentConfig()
                : learningServiceClient.getPluginConfig(pluginId, authToken);

        String userPrompt = """
            Suggest optimal configuration for this plugin:

            Plugin ID: %s
            Plugin Info: %s
            Current Config: %s
            Admin's Goal: %s
            """.formatted(pluginId, pluginInfo, currentConfig,
                    request.goal() != null ? request.goal() : "general optimization");

        String rawResponse = llamaApiService.generateJson(userPrompt, SYSTEM_PROMPT);
        String cleaned = AiJsonResponseCleaner.clean(rawResponse);

        try {
            JsonNode root = objectMapper.readTree(cleaned);
            Map<String, String> suggested = new LinkedHashMap<>();
            if (root.has("suggestedConfig")) {
                root.get("suggestedConfig").fields().forEachRemaining(
                        entry -> suggested.put(entry.getKey(), entry.getValue().asText()));
            }
            String reasoning = root.has("reasoning") ? root.get("reasoning").asText() : "";

            return new PluginConfigSuggestionResponse(pluginId, suggested, reasoning);
        } catch (Exception e) {
            log.error("Failed to parse config suggestion for plugin '{}'", pluginId, e);
            throw new RuntimeException("Failed to parse config suggestions: " + e.getMessage(), e);
        }
    }
}
