package com.university.lms.ai.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.domain.model.AiTaskType;
import com.university.lms.ai.prompt.AiSchemaRegistry;
import com.university.lms.ai.provider.GeminiProviderClient;
import com.university.lms.ai.service.AiTaskHandler;
import com.university.lms.ai.validation.AiOutputValidator;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class GenerateRteMaterialHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final AiOutputValidator validator;
    private final ObjectMapper mapper;

    public GenerateRteMaterialHandler(GeminiProviderClient geminiClient, AiSchemaRegistry schemaRegistry, AiOutputValidator validator, ObjectMapper mapper) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.mapper = mapper;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.GENERATE_RTE_MATERIAL;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, String apiKey) {
        String systemPrompt = "You are an expert educator. Generate learning material in RichContentDocument JSON format matching the schema perfectly. Do not use markdown strings, strictly construct the blocks.";
        String prompt;
        try {
            prompt = "Generate learning material based on requirements: " + mapper.writeValueAsString(input);
        } catch (Exception e) {
            prompt = "Generate learning material based on input: " + input.toString();
        }

        JsonNode result = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getGenerateRteMaterialSchema()
        );

        validator.validateRteMaterial(result);
        return result;
    }
}
