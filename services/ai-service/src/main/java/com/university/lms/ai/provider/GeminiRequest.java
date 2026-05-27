package com.university.lms.ai.provider;

import java.util.List;
import java.util.Map;

public record GeminiRequest(
        List<Content> contents,
        SystemInstruction systemInstruction,
        GenerationConfig generationConfig
) {
    public record Content(String role, List<Part> parts) {}
    public record Part(String text) {}
    public record SystemInstruction(List<Part> parts) {}
    public record GenerationConfig(
            String responseMimeType,
            Map<String, Object> responseJsonSchema,
            Double temperature
    ) {}

    public static GeminiRequest of(String prompt, String systemPrompt, Map<String, Object> schema) {
        return new GeminiRequest(
                List.of(new Content("user", List.of(new Part(prompt)))),
                new SystemInstruction(List.of(new Part(systemPrompt))),
                new GenerationConfig("application/json", schema, 0.2)
        );
    }
}
