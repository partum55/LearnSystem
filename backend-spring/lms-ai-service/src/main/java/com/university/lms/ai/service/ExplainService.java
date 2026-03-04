package com.university.lms.ai.service;

import com.university.lms.ai.dto.ExplainRequest;
import com.university.lms.ai.dto.ExplainResponse;
import com.university.lms.ai.infrastructure.llm.AIGateway;
import com.university.lms.ai.infrastructure.llm.LLMGenerationOptions;
import com.university.lms.ai.infrastructure.llm.LLMResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExplainService {

    private final AIGateway aiGateway;
    private final AICostTrackingService costTrackingService;

    public ExplainResponse explain(ExplainRequest request, String apiKey, UUID userId) {
        String systemPrompt = String.format(
                "You are a helpful educational assistant. Explain the following %s content clearly and concisely for a student. " +
                "Use simple language and provide examples where helpful. Language: %s.",
                request.getContentType().toLowerCase(),
                request.getLanguage()
        );

        LLMGenerationOptions options = LLMGenerationOptions.builder()
                .generationType("explain")
                .maxTokens(2000)
                .temperature(0.7)
                .topP(0.9)
                .build();

        LLMResponse llmResponse = aiGateway.generate(
                request.getContentText(), systemPrompt, options, apiKey);

        costTrackingService.recordUsage(
                userId.toString(),
                llmResponse.getPromptTokens(),
                llmResponse.getCompletionTokens()
        );

        return ExplainResponse.builder()
                .explanation(llmResponse.getContent())
                .language(request.getLanguage())
                .tokensUsed(llmResponse.getTotalTokens())
                .build();
    }
}
