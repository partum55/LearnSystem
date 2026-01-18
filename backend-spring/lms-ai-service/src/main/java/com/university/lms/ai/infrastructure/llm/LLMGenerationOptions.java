package com.university.lms.ai.infrastructure.llm;

import lombok.Builder;
import lombok.Data;

/**
 * Options for LLM text generation.
 */
@Data
@Builder
public class LLMGenerationOptions {

    @Builder.Default
    private double temperature = 0.7;

    @Builder.Default
    private int maxTokens = 4000;

    @Builder.Default
    private double topP = 0.9;

    @Builder.Default
    private String generationType = "text";

    /**
     * Optional model override (uses provider default if null)
     */
    private String model;

    public static LLMGenerationOptions defaults() {
        return LLMGenerationOptions.builder().build();
    }

    public static LLMGenerationOptions forCourseGeneration() {
        return LLMGenerationOptions.builder()
                .temperature(0.7)
                .maxTokens(8000)
                .generationType("course")
                .build();
    }

    public static LLMGenerationOptions forQuizGeneration() {
        return LLMGenerationOptions.builder()
                .temperature(0.5)
                .maxTokens(4000)
                .generationType("quiz")
                .build();
    }

    public static LLMGenerationOptions forExplanation() {
        return LLMGenerationOptions.builder()
                .temperature(0.3)
                .maxTokens(2000)
                .generationType("explanation")
                .build();
    }
}

