package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.GradeSuggestionRequest;
import com.university.lms.ai.dto.GradeSuggestionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
public class GradingSuggestionService {

    private final LlamaApiService llamaApiService;
    private final AICostTrackingService costTrackingService;
    private final ObjectMapper objectMapper;
    private final WebClient learningServiceClient;

    public GradingSuggestionService(
            LlamaApiService llamaApiService,
            AICostTrackingService costTrackingService,
            ObjectMapper objectMapper,
            @Value("${services.learning-service.url:http://localhost:8089}") String learningServiceUrl) {
        this.llamaApiService = llamaApiService;
        this.costTrackingService = costTrackingService;
        this.objectMapper = objectMapper;
        this.learningServiceClient = WebClient.create(learningServiceUrl + "/api");
    }

    public GradeSuggestionResponse suggestGrade(GradeSuggestionRequest request, String apiKey,
                                                 String authToken, UUID userId) {
        String assignmentData = fetchData("/assignments/" + request.getAssignmentId(), authToken);
        String submissionData = fetchData("/submissions/" + request.getSubmissionId(), authToken);

        String systemPrompt =
                "You are an educational grading assistant. Analyze the student submission against the assignment requirements " +
                "and rubric. Provide a fair and constructive grade suggestion.\n\n" +
                "Respond ONLY with valid JSON:\n" +
                "{\"suggestedGrade\": 85.0, \"maxPoints\": 100, \"feedback\": \"Overall assessment...\", " +
                "\"strengths\": [\"Good point 1\", \"Good point 2\"], " +
                "\"improvements\": [\"Could improve X\", \"Consider Y\"]}";

        String prompt = "Assignment details:\n" + assignmentData + "\n\nStudent submission:\n" + submissionData;
        String result = llamaApiService.generateJsonWithKey(prompt, systemPrompt, apiKey);

        try {
            return objectMapper.readValue(cleanJson(result), GradeSuggestionResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse grade suggestion response", e);
            throw new RuntimeException("Failed to generate grade suggestion: " + e.getMessage(), e);
        }
    }

    private String fetchData(String path, String authToken) {
        try {
            String response = learningServiceClient.get()
                    .uri(path)
                    .header("Authorization", authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            return response != null ? response : "{}";
        } catch (Exception e) {
            log.warn("Failed to fetch {}: {}", path, e.getMessage());
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
