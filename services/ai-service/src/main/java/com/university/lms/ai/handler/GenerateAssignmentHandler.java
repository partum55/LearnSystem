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
public class GenerateAssignmentHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final AiOutputValidator validator;
    private final ObjectMapper mapper;

    public GenerateAssignmentHandler(GeminiProviderClient geminiClient, AiSchemaRegistry schemaRegistry, AiOutputValidator validator, ObjectMapper mapper) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.mapper = mapper;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.GENERATE_ASSIGNMENT;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, String apiKey) {
        String systemPrompt = "You are an expert educator. Generate an assignment in JSON format matching the schema perfectly. The type must be one of: TEXT_SUBMISSION, FILE_SUBMISSION, QUIZ, VPL, SEMINAR.";
        String prompt;
        try {
            prompt = "Generate an assignment based on requirements: " + mapper.writeValueAsString(input);
        } catch (Exception e) {
            prompt = "Generate an assignment based on input: " + input.toString();
        }

        JsonNode result = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getGenerateAssignmentSchema()
        );

        validator.validateAssignmentDraft(result);
        return result;
    }
}
