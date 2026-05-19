package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.PracticeQuizRequest;
import com.university.lms.ai.dto.PracticeQuizResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
public class PracticeQuizService {

    private final LlamaApiService llamaApiService;
    private final AICostTrackingService costTrackingService;
    private final ObjectMapper objectMapper;
    private final WebClient learningServiceClient;

    public PracticeQuizService(
            LlamaApiService llamaApiService,
            AICostTrackingService costTrackingService,
            ObjectMapper objectMapper,
            @Value("${services.learning-service.url:http://localhost:8089}") String learningServiceUrl) {
        this.llamaApiService = llamaApiService;
        this.costTrackingService = costTrackingService;
        this.objectMapper = objectMapper;
        this.learningServiceClient = WebClient.create(learningServiceUrl + "/api");
    }

    public PracticeQuizResponse generatePracticeQuiz(PracticeQuizRequest request, String apiKey,
                                                      String authToken, UUID userId) {
        // Fetch module content from learning-service
        String moduleContent = fetchModuleContent(request.getCourseId(), request.getModuleId(), authToken);

        String systemPrompt = String.format(
                "You are an educational quiz generator. Based on the course material provided, generate %d practice questions " +
                "at %s difficulty level. Language: %s.\n\n" +
                "Respond ONLY with valid JSON in this format:\n" +
                "{\"title\": \"Practice Quiz\", \"questions\": [{\"questionText\": \"...\", \"questionType\": \"MULTIPLE_CHOICE\", " +
                "\"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": \"A\", \"explanation\": \"...\", \"points\": 1}]}\n\n" +
                "questionType must be either MULTIPLE_CHOICE or TRUE_FALSE. For TRUE_FALSE, options should be [\"True\", \"False\"].",
                request.getQuestionCount(),
                request.getDifficulty(),
                request.getLanguage()
        );

        String result = llamaApiService.generateJsonWithKey(moduleContent, systemPrompt, apiKey);

        try {
            PracticeQuizResponse response = objectMapper.readValue(
                    cleanJsonResponse(result), PracticeQuizResponse.class);
            return response;
        } catch (Exception e) {
            log.error("Failed to parse practice quiz response", e);
            throw new RuntimeException("Failed to generate practice quiz: " + e.getMessage(), e);
        }
    }

    private String fetchModuleContent(String courseId, String moduleId, String authToken) {
        try {
            String response = learningServiceClient.get()
                    .uri("/courses/{courseId}/modules/{moduleId}", courseId, moduleId)
                    .header("Authorization", authToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            return response != null ? response : "No content available";
        } catch (Exception e) {
            log.warn("Failed to fetch module content: {}", e.getMessage());
            return "Module content unavailable";
        }
    }

    private String cleanJsonResponse(String response) {
        if (response == null) return "{}";
        String cleaned = response.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        }
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
