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
public class SuggestGradeHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final AiOutputValidator validator;
    private final ObjectMapper mapper;

    public SuggestGradeHandler(GeminiProviderClient geminiClient, AiSchemaRegistry schemaRegistry, AiOutputValidator validator, ObjectMapper mapper) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.mapper = mapper;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.SUGGEST_GRADE;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, String apiKey) {
        String systemPrompt = "You are an expert teaching assistant. Suggest a grade and feedback for the student submission. The feedbackJson must be a valid RichContentDocument. The response must perfectly match the JSON schema.";
        String prompt;
        try {
            prompt = "Review this submission and suggest a grade based on input: " + mapper.writeValueAsString(input);
        } catch (Exception e) {
            prompt = "Review this submission and suggest a grade based on input: " + input.toString();
        }

        JsonNode result = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getSuggestGradeSchema()
        );

        validator.validateGradeSuggestion(result);
        return result;
    }
}
