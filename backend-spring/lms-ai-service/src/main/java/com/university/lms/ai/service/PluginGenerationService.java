package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.plugin.PluginGenerationRequest;
import com.university.lms.ai.dto.plugin.PluginGenerationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PluginGenerationService {

    private final LlamaApiService llamaApiService;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
        You are an expert Python plugin developer for a Learning Management System.
        You generate complete, production-ready Python sidecar plugins.

        ## Plugin Package Structure
        A plugin ZIP contains:
        - plugin.json: manifest file
        - main.py: FastAPI entry point
        - requirements.txt: pip dependencies

        ## plugin.json format:
        {
          "id": "<reverse-domain-id>",
          "name": "<Human Readable Name>",
          "version": "1.0.0",
          "description": "<description>",
          "author": "AI Generator",
          "minLmsVersion": "1.0.0",
          "runtime": "python",
          "type": "<ANALYTICS|CONTENT|ASSESSMENT|INTEGRATION|NOTIFICATION|THEME|OTHER>",
          "permissions": ["courses.read", "grades.read", "users.read", "submissions.read"],
          "dependencies": [],
          "entryPoints": null
        }

        ## Required HTTP Endpoints in main.py:
        - GET /health → {"status": "ok"}
        - POST /lifecycle/{event} where event is install|enable|disable|uninstall

        ## Available Environment Variables:
        PLUGIN_ID, PLUGIN_PORT, PLUGIN_SCHEMA, PLUGIN_PERMISSIONS, PLUGIN_CONFIG,
        LMS_DB_HOST, LMS_DB_PORT, LMS_DB_NAME, LMS_DB_USER, LMS_DB_PASSWORD

        ## Example main.py structure:
        ```python
        import os
        import uvicorn
        from fastapi import FastAPI

        app = FastAPI()
        PLUGIN_PORT = int(os.environ.get("PLUGIN_PORT", "9100"))

        @app.get("/health")
        async def health():
            return {"status": "ok"}

        @app.post("/lifecycle/{event}")
        async def lifecycle(event: str):
            return {"status": "ok"}

        # Custom endpoints here...

        if __name__ == "__main__":
            uvicorn.run(app, host="0.0.0.0", port=PLUGIN_PORT)
        ```

        ## Reserved paths (do NOT use): /enable, /disable, /config, /logs

        ## Output Format:
        Respond with a JSON object containing exactly these fields:
        - "pluginJson": string containing the complete plugin.json content
        - "mainPy": string containing the complete main.py code
        - "requirementsTxt": string containing the requirements.txt content

        Always include fastapi, uvicorn[standard] in requirements.txt.
        Use psycopg2-binary if database access is needed.
        """;

    public PluginGenerationResponse generate(PluginGenerationRequest request) {
        log.info("Generating plugin from description: {}", request.pluginName());

        String userPrompt = buildUserPrompt(request);
        String rawResponse = llamaApiService.generateJson(userPrompt, SYSTEM_PROMPT);
        String cleaned = AiJsonResponseCleaner.clean(rawResponse);

        try {
            JsonNode root = objectMapper.readTree(cleaned);
            String pluginJson = root.get("pluginJson").asText();
            String mainPy = root.get("mainPy").asText();
            String requirementsTxt = root.has("requirementsTxt")
                ? root.get("requirementsTxt").asText()
                : "fastapi>=0.100.0\nuvicorn[standard]>=0.23.0\n";

            String pluginId = request.pluginId();
            if (pluginId == null || pluginId.isBlank()) {
                JsonNode manifest = objectMapper.readTree(pluginJson);
                pluginId = manifest.get("id").asText();
            }

            return new PluginGenerationResponse(
                pluginId,
                request.pluginName() != null ? request.pluginName() : "Generated Plugin",
                pluginJson,
                mainPy,
                requirementsTxt
            );
        } catch (Exception e) {
            log.error("Failed to parse plugin generation response", e);
            throw new RuntimeException("Failed to parse generated plugin code: " + e.getMessage(), e);
        }
    }

    private String buildUserPrompt(PluginGenerationRequest request) {
        var sb = new StringBuilder();
        sb.append("Generate a Python plugin with the following requirements:\n\n");
        sb.append("Description: ").append(request.description()).append("\n");

        if (request.pluginName() != null) {
            sb.append("Plugin Name: ").append(request.pluginName()).append("\n");
        }
        if (request.pluginId() != null) {
            sb.append("Plugin ID: ").append(request.pluginId()).append("\n");
        }
        if (request.pluginType() != null) {
            sb.append("Plugin Type: ").append(request.pluginType()).append("\n");
        }
        if (request.permissions() != null && !request.permissions().isEmpty()) {
            sb.append("Permissions needed: ").append(String.join(", ", request.permissions())).append("\n");
        }
        if (request.language() != null) {
            sb.append("Output language for user-facing text: ").append(request.language()).append("\n");
        }
        if (request.additionalDetails() != null) {
            sb.append("\nAdditional details:\n").append(request.additionalDetails()).append("\n");
        }

        return sb.toString();
    }
}
