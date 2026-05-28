package com.university.lms.ai.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.domain.model.AiTaskType;
import com.university.lms.ai.prompt.AiSchemaRegistry;
import com.university.lms.ai.provider.GeminiProviderClient;
import com.university.lms.ai.service.AiTaskHandler;
import com.university.lms.ai.service.AiOutputSanitizer;
import com.university.lms.ai.exception.AiOutputInvalidException;
import com.university.lms.ai.validation.AiOutputNormalizer;
import com.university.lms.ai.validation.AiOutputValidator;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class GenerateRteMaterialHandler implements AiTaskHandler {

    private final GeminiProviderClient geminiClient;
    private final AiSchemaRegistry schemaRegistry;
    private final AiOutputValidator validator;
    private final AiOutputNormalizer normalizer;
    private final ObjectMapper mapper;

    public GenerateRteMaterialHandler(GeminiProviderClient geminiClient, AiSchemaRegistry schemaRegistry, AiOutputValidator validator, AiOutputNormalizer normalizer, ObjectMapper mapper) {
        this.geminiClient = geminiClient;
        this.schemaRegistry = schemaRegistry;
        this.validator = validator;
        this.normalizer = normalizer;
        this.mapper = mapper;
    }

    @Override
    public AiTaskType getTaskType() {
        return AiTaskType.GENERATE_RTE_MATERIAL;
    }

    @Override
    public JsonNode execute(Map<String, Object> context, Map<String, Object> input, UUID userId, String apiKey) {
        String systemPrompt = """
                You are an expert educator generating canonical LearnSystem JSON.
                Return JSON only. Do not include markdown fences, prose, or explanations.
                Use exactly these top-level field names: title, contentJson.
                contentJson must be a RichContentDocument with version: 1, type: "RICH_CONTENT", and blocks.
                Each block must have type and data.
                Allowed block types: heading, paragraph, list, quote, code, mermaid, math.
                Do not return markdown, HTML, or legacy resource blobs.
                """;
        String prompt;
        try {
            prompt = """
                    Generate one RTE learning material from this JSON input: %s
                    The response must match this shape:
                    {"title":"...","contentJson":{"version":1,"type":"RICH_CONTENT","blocks":[{"type":"paragraph","data":{"text":"..."}}]}}
                    Return JSON only.
                    """.formatted(mapper.writeValueAsString(input));
        } catch (Exception e) {
            prompt = "Generate learning material based on input: " + String.valueOf(input);
        }

        JsonNode rawResult = geminiClient.generateContent(
                apiKey,
                prompt,
                systemPrompt,
                schemaRegistry.getGenerateRteMaterialSchema()
        );

        JsonNode result = normalizer.normalizeRteMaterial(rawResult);
        try {
            validator.validateRteMaterial(result);
        } catch (AiOutputInvalidException exception) {
            throw new AiOutputInvalidException(
                    exception.getDiagnostics(),
                    AiOutputSanitizer.sanitizedJson(rawResult, mapper),
                    exception);
        }
        return result;
    }
}
