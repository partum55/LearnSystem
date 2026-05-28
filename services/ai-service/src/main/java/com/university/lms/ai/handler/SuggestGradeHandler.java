package com.university.lms.ai.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.university.lms.ai.domain.model.AiTaskType;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.exception.AiOutputInvalidException;
import com.university.lms.ai.prompt.AiSchemaRegistry;
import com.university.lms.ai.provider.GeminiProviderClient;
import com.university.lms.ai.service.AiTaskHandler;
import com.university.lms.ai.service.AiOutputSanitizer;
import com.university.lms.ai.service.LearningServiceClient;
import com.university.lms.ai.validation.AiOutputNormalizer;
import com.university.lms.ai.validation.AiOutputValidator;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class SuggestGradeHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final AiOutputValidator validator;
    private final AiOutputNormalizer normalizer;
    private final ObjectMapper mapper;
    private final LearningServiceClient learningServiceClient;

    public SuggestGradeHandler(
            GeminiProviderClient geminiClient,
            AiSchemaRegistry schemaRegistry,
            AiOutputValidator validator,
            AiOutputNormalizer normalizer,
            ObjectMapper mapper,
            LearningServiceClient learningServiceClient) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.normalizer = normalizer;
        this.mapper = mapper;
        this.learningServiceClient = learningServiceClient;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.SUGGEST_GRADE;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, UUID userId, String apiKey) {
        JsonNode reviewContext = learningServiceClient.getSubmissionReviewContext(
                requireUuid(input, "submissionId"),
                userId
        );

        String systemPrompt = """
                You are an expert teaching assistant. Suggest a grade and feedback for the student submission.
                Return JSON only. Do not include markdown fences, prose, or explanations.
                Use only the provided assignment, rubric/settings, max points, and submitted content.
                Do not save or publish a grade.
                feedbackJson must be a RichContentDocument with version: 1, type: "RICH_CONTENT", and blocks.
                Each block must have type and data.
                Allowed block types: heading, paragraph, list, quote, code, mermaid, math.
                """;
        String prompt;
        try {
            ObjectNode gradingInput = mapper.createObjectNode();
            gradingInput.set("request", mapper.valueToTree(input));
            gradingInput.set("reviewContext", reviewContext);
            prompt = "Review this submission and suggest a grade based on this JSON context: " + mapper.writeValueAsString(gradingInput);
        } catch (Exception e) {
            prompt = "Review this submission and suggest a grade based on input: " + input + " and review context: " + reviewContext;
        }

        JsonNode rawResult = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getSuggestGradeSchema()
        );

        JsonNode result = normalizer.normalizeGradeSuggestion(rawResult);
        try {
            validator.validateGradeSuggestion(result);
        } catch (AiOutputInvalidException exception) {
            throw new AiOutputInvalidException(
                    exception.getDiagnostics(),
                    AiOutputSanitizer.sanitizedJson(rawResult, mapper),
                    exception);
        }
        return result;
    }

    private UUID requireUuid(Map<String, Object> input, String key) {
        if (input == null || input.get(key) == null) {
            throw new AiException(AiErrorCode.AI_TASK_FAILED, key + " is required for grade suggestion");
        }
        try {
            return UUID.fromString(input.get(key).toString());
        } catch (IllegalArgumentException e) {
            throw new AiException(AiErrorCode.AI_TASK_FAILED, key + " must be a valid UUID", e);
        }
    }
}
