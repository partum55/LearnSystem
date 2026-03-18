package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.SyllabusRequest;
import com.university.lms.ai.dto.SyllabusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyllabusGenerationService {

    private final LlamaApiService llamaApiService;
    private final ObjectMapper objectMapper;

    public SyllabusResponse generateSyllabus(SyllabusRequest request, String apiKey, UUID userId) {
        String systemPrompt = String.format(
                "You are an academic syllabus writer. Generate a comprehensive university course syllabus " +
                "with %d weeks. Language: %s.\n\n" +
                "Respond ONLY with valid JSON in this exact format:\n" +
                "{\"pages\": [\n" +
                "  {\"id\": \"aim\", \"title\": \"Aim & Objectives\", \"icon\": \"target\", \"content\": \"markdown content here\"},\n" +
                "  {\"id\": \"schedule\", \"title\": \"Schedule\", \"icon\": \"calendar\", \"content\": \"markdown with week-by-week schedule\"},\n" +
                "  {\"id\": \"grading\", \"title\": \"Grading\", \"icon\": \"chart-bar\", \"content\": \"markdown with grading criteria\"},\n" +
                "  {\"id\": \"materials\", \"title\": \"Materials\", \"icon\": \"book-open\", \"content\": \"markdown with required materials\"},\n" +
                "  {\"id\": \"policies\", \"title\": \"Policies\", \"icon\": \"clipboard-list\", \"content\": \"markdown with course policies\"}\n" +
                "]}\n\n" +
                "Each content field should contain rich markdown with headers, lists, and emphasis.",
                request.getWeekCount(),
                request.getLanguage()
        );

        String result = llamaApiService.generateJsonWithKey(
                "Course description: " + request.getCourseDescription(), systemPrompt, apiKey);

        try {
            return objectMapper.readValue(cleanJson(result), SyllabusResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse syllabus response", e);
            throw new RuntimeException("Failed to generate syllabus: " + e.getMessage(), e);
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
