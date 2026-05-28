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
import java.util.UUID;

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
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, UUID userId, String apiKey) {
        String systemPrompt = "You are an expert curriculum designer. Generate a structured course draft matching the schema perfectly. " +
                "Do NOT use markdown outside of RichContentDocument blocks. RichContentDocument blocks must follow strict JSON structure. " +
                "All enum values must be UPPERCASE. " +
                "Learning item type must be only RTE or LESSON. Prefer RTE for normal generated materials. " +
                "Assignment type must be only TEXT_SUBMISSION, FILE_SUBMISSION, QUIZ, FORM, VPL, or SEMINAR. Prefer TEXT_SUBMISSION for ordinary written tasks. " +
                "Every learningItems[].contentJson and assignments[].instructionsJson must be a full RichContentDocument: " +
                "{\"version\":1,\"type\":\"RICH_CONTENT\",\"blocks\":[{\"type\":\"paragraph\",\"data\":{\"text\":\"...\"}}]}. " +
                "Do not return empty objects for contentJson or instructionsJson.";
        
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
