package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.plugin.PluginDiagnosisRequest;
import com.university.lms.ai.dto.plugin.PluginDiagnosisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class PluginDiagnosticsService {

    private final LlamaApiService llamaApiService;
    private final PluginLearningServiceClient learningServiceClient;
    private final ObjectMapper objectMapper;

    private static final Pattern SECRET_PATTERN = Pattern.compile(
            "(?i)(password|passwd|secret|api[_-]?key|token|authorization|credential|" +
            "private[_-]?key|access[_-]?key|connection[_-]?string)\\s*[=:]\\s*\\S+");
    private static final int MAX_LOG_LENGTH = 5000;

    private static final String SYSTEM_PROMPT = """
        You are an expert diagnostician for Python sidecar plugins in a Learning Management System.
        Given plugin info, configuration, recent logs, and reported symptoms, identify the root cause
        and suggest fixes.

        Respond with JSON:
        {
          "rootCause": "concise root cause description",
          "suggestedFixes": ["fix 1", "fix 2"],
          "severity": "LOW|MEDIUM|HIGH|CRITICAL",
          "explanation": "detailed explanation of the issue and why the suggested fixes should work"
        }
        """;

    public PluginDiagnosisResponse diagnose(String pluginId, PluginDiagnosisRequest request,
                                             String authToken) {
        log.info("Diagnosing plugin '{}'", pluginId);

        int logLines = request.recentLogLines() != null ? request.recentLogLines() : 50;

        String pluginInfo = learningServiceClient.getPluginInfo(pluginId, authToken);
        var pluginConfig = learningServiceClient.getPluginConfig(pluginId, authToken);
        String pluginLogs = learningServiceClient.getPluginLogs(pluginId, logLines, authToken);

        log.warn("Plugin diagnostics for '{}' will send sanitized data to external AI service", pluginId);

        String userPrompt = buildDiagnosisPrompt(pluginId,
                sanitize(pluginInfo),
                sanitize(pluginConfig.toString()),
                sanitize(pluginLogs),
                request.symptoms());

        String rawResponse = llamaApiService.generateJson(userPrompt, SYSTEM_PROMPT);
        String cleaned = AiJsonResponseCleaner.clean(rawResponse);

        try {
            JsonNode root = objectMapper.readTree(cleaned);
            String rootCause = root.get("rootCause").asText();
            List<String> fixes = new ArrayList<>();
            if (root.has("suggestedFixes")) {
                root.get("suggestedFixes").forEach(n -> fixes.add(n.asText()));
            }
            String severity = root.has("severity") ? root.get("severity").asText() : "MEDIUM";
            String explanation = root.has("explanation") ? root.get("explanation").asText() : "";

            return new PluginDiagnosisResponse(pluginId, rootCause, fixes, severity, explanation);
        } catch (Exception e) {
            log.error("Failed to parse diagnosis response for plugin '{}'", pluginId, e);
            throw new RuntimeException("Failed to parse diagnosis: " + e.getMessage(), e);
        }
    }

    private String buildDiagnosisPrompt(String pluginId, String info, String config,
                                         String logs, String symptoms) {
        return """
            Diagnose the following plugin issue:

            Plugin ID: %s
            Plugin Info: %s
            Plugin Config: %s
            Recent Logs: %s
            Reported Symptoms: %s
            """.formatted(pluginId, info, config, logs, symptoms != null ? symptoms : "none reported");
    }

    private String sanitize(String input) {
        if (input == null) return "";
        String redacted = SECRET_PATTERN.matcher(input).replaceAll("$1=***REDACTED***");
        if (redacted.length() > MAX_LOG_LENGTH) {
            redacted = redacted.substring(0, MAX_LOG_LENGTH) + "\n... [truncated]";
        }
        return redacted;
    }
}
