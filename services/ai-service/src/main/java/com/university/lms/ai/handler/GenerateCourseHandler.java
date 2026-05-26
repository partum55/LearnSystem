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
public class GenerateCourseHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final AiOutputValidator validator;
    private final ObjectMapper mapper;

    public GenerateCourseHandler(GeminiProviderClient geminiClient, AiSchemaRegistry schemaRegistry, AiOutputValidator validator, ObjectMapper mapper) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.mapper = mapper;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.GENERATE_COURSE;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, String apiKey) {
        String systemPrompt = "You are an expert curriculum designer. Generate a structured course draft matching the schema perfectly. " +
                "Do NOT use markdown outside of RichContentDocument blocks. RichContentDocument blocks must follow strict JSON structure. " +
                "All enum values must be UPPERCASE.";
        
        String prompt;
        try {
            prompt = "Generate a course with these requirements: " + mapper.writeValueAsString(input);
        } catch (Exception e) {
            prompt = "Generate a course based on input: " + input.toString();
        }

        JsonNode result = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getGenerateCourseSchemaInlined()
        );

        validator.validateCourseDraft(result);
        return result;
    }
}
