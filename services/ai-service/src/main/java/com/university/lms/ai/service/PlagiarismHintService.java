package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.PlagiarismCheckRequest;
import com.university.lms.ai.dto.PlagiarismCheckResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
public class PlagiarismHintService {

    private final LlamaApiService llamaApiService;
    private final AICostTrackingService costTrackingService;
    private final ObjectMapper objectMapper;
    private final WebClient learningServiceClient;

    public PlagiarismHintService(
            LlamaApiService llamaApiService,
            AICostTrackingService costTrackingService,
            ObjectMapper objectMapper,
            @Value("${services.learning-service.url:http://localhost:8089}") String learningServiceUrl) {
        this.llamaApiService = llamaApiService;
        this.costTrackingService = costTrackingService;
        this.objectMapper = objectMapper;
        this.learningServiceClient = WebClient.create(learningServiceUrl + "/api");
    }

    public PlagiarismCheckResponse checkPlagiarism(PlagiarismCheckRequest request, String apiKey,
                                                    String authToken, UUID userId) {
        String submissionData = fetchSubmission(request.getSubmissionId(), authToken);

        String systemPrompt =
                "You are an academic integrity analysis assistant. Analyze the following student submission for potential " +
                "plagiarism indicators. Look for: style inconsistencies, unusual vocabulary shifts, signs of AI generation, " +
                "formality inconsistencies, abrupt topic transitions.\n\n" +
                "IMPORTANT: This is a heuristic analysis, NOT definitive plagiarism detection.\n\n" +
                "Respond ONLY with valid JSON:\n" +
                "{\"riskLevel\": \"LOW\", \"indicators\": [\"Indicator 1\", \"Indicator 2\"], " +
                "\"summary\": \"Brief overall assessment\"}.\n" +
                "riskLevel must be one of: LOW, MEDIUM, HIGH.";

        String result = llamaApiService.generateJsonWithKey(submissionData, systemPrompt, apiKey);

        try {
            return objectMapper.readValue(cleanJson(result), PlagiarismCheckResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse plagiarism check response", e);
            throw new RuntimeException("Failed to check plagiarism: " + e.getMessage(), e);
        }
    }

    private String fetchSubmission(String submissionId, String authToken) {
        try {
            String response = learningServiceClient.get()
                    .uri("/submissions/" + submissionId)
                    .header("Authorization", authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            return response != null ? response : "{}";
        } catch (Exception e) {
            log.warn("Failed to fetch submission {}: {}", submissionId, e.getMessage());
            return "{}";
        }
    }

    private String cleanJson(String response) {
        if (response == null) return "{}";
        String cleaned = response.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
        if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3);
        return cleaned.trim();
    }
}
