package com.university.lms.ai.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.domain.model.AiTaskType;
import com.university.lms.ai.prompt.AiSchemaRegistry;
import com.university.lms.ai.provider.GeminiProviderClient;
import com.university.lms.ai.service.AiTaskHandler;
import com.university.lms.ai.validation.RichContentValidator;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ImproveInstructionsHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final RichContentValidator validator;
    private final ObjectMapper mapper;

    public ImproveInstructionsHandler(GeminiProviderClient geminiClient, AiSchemaRegistry schemaRegistry, RichContentValidator validator, ObjectMapper mapper) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.mapper = mapper;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.IMPROVE_ASSIGNMENT_INSTRUCTIONS;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, String apiKey) {
        String systemPrompt = "You are an expert educator. Improve the given assignment instructions according to the desired operation. Output MUST be a valid RichContentDocument perfectly matching the schema.";
        String prompt;
        try {
            prompt = "Improve the following instructions: " + mapper.writeValueAsString(input);
        } catch (Exception e) {
            prompt = "Improve the following instructions based on input: " + input.toString();
        }

        JsonNode result = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getRichContentSchema()
        );

        validator.validate(result);
        return result;
    }
}
