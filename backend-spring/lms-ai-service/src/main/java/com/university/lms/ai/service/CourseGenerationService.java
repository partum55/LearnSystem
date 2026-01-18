package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.CourseEditRequest;
import com.university.lms.ai.dto.CourseGenerationRequest;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Service for generating course content using AI
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseGenerationService {

    private final LlamaApiService llamaApiService;
    private final ObjectMapper objectMapper;
    private final AIGenerationCacheService cacheService;

    /**
     * Generate a complete course structure from a prompt
     */
    public GeneratedCourseResponse generateCourse(CourseGenerationRequest request) {
        log.info("Generating course from prompt: {}", request.getPrompt());

        // Build cache key from request
        String cacheKey = buildCacheKey(request);

        // Check cache first
        Optional<String> cached = cacheService.getCached(cacheKey);
        if (cached.isPresent()) {
            try {
                GeneratedCourseResponse response = objectMapper.readValue(
                    cached.get(),
                    GeneratedCourseResponse.class
                );
                log.info("Returning cached course generation result");
                return response;
            } catch (Exception e) {
                log.warn("Failed to parse cached result, regenerating", e);
                cacheService.invalidate(cacheKey);
            }
        }

        String systemPrompt = buildCourseSystemPrompt(request);
        String userPrompt = buildCourseUserPrompt(request);

        try {
            String jsonResponse = llamaApiService.generateJson(userPrompt, systemPrompt);

            // Clean up response if it contains markdown code blocks
            jsonResponse = cleanJsonResponse(jsonResponse);

            GeneratedCourseResponse response = objectMapper.readValue(jsonResponse, GeneratedCourseResponse.class);

            // Cache the result
            cacheService.cache(cacheKey, jsonResponse);

            log.info("Successfully generated course structure");
            return response;

        } catch (Exception e) {
            log.error("Error generating course", e);
            throw new RuntimeException("Failed to generate course: " + e.getMessage(), e);
        }
    }

    /**
     * Edit existing course content with AI
     */
    public String editCourseContent(CourseEditRequest request) {
        log.info("Editing {} content with prompt: {}", request.getEntityType(), request.getPrompt());

        // Build cache key
        String cacheKey = request.getEntityType() + ":" +
                          request.getPrompt() + ":" +
                          (request.getCurrentData() != null ? request.getCurrentData().hashCode() : "");

        // Check cache
        Optional<String> cached = cacheService.getCached(cacheKey);
        if (cached.isPresent()) {
            log.info("Returning cached edit result");
            return cached.get();
        }

        String systemPrompt = buildEditSystemPrompt(request);
        String userPrompt = buildEditUserPrompt(request);

        try {
            String jsonResponse = llamaApiService.generateJson(userPrompt, systemPrompt);
            jsonResponse = cleanJsonResponse(jsonResponse);

            // Cache the result
            cacheService.cache(cacheKey, jsonResponse);

            log.info("Successfully edited {} content", request.getEntityType());
            return jsonResponse;

        } catch (Exception e) {
            log.error("Error editing content", e);
            throw new RuntimeException("Failed to edit content: " + e.getMessage(), e);
        }
    }

    /**
     * Build cache key from request
     */
    private String buildCacheKey(CourseGenerationRequest request) {
        return String.format("%s|lang:%s|modules:%b|assignments:%b|quizzes:%b|year:%s",
            request.getPrompt(),
            request.getLanguage(),
            request.getIncludeModules(),
            request.getIncludeAssignments(),
            request.getIncludeQuizzes(),
            request.getAcademicYear()
        );
    }

    private String buildCourseSystemPrompt(CourseGenerationRequest request) {
        String language = request.getLanguage().equals("uk") ? "українською" : "in English";

        StringBuilder sb = new StringBuilder();
        sb.append("You are an expert educational content creator for a university Learning Management System. ");
        sb.append("Create comprehensive and well-structured course content ").append(language).append(". ");
        sb.append("Your response must be valid JSON matching this exact structure:\n\n");
        sb.append("{\n");
        sb.append("  \"course\": {\n");
        sb.append("    \"code\": \"COURSE_CODE\",\n");
        sb.append("    \"titleUk\": \"Назва курсу українською\",\n");
        sb.append("    \"titleEn\": \"Course Title in English\",\n");
        sb.append("    \"descriptionUk\": \"Опис українською\",\n");
        sb.append("    \"descriptionEn\": \"Description in English\",\n");
        sb.append("    \"syllabus\": \"Детальний силабус курсу\",\n");
        sb.append("    \"startDate\": \"2025-09-01\",\n");
        sb.append("    \"endDate\": \"2026-06-30\",\n");
        sb.append("    \"academicYear\": \"2025-2026\",\n");
        sb.append("    \"maxStudents\": 30\n");
        sb.append("  },\n");

        if (request.getIncludeModules()) {
            sb.append("  \"modules\": [\n");
            sb.append("    {\n");
            sb.append("      \"title\": \"Module Title\",\n");
            sb.append("      \"description\": \"Module description\",\n");
            sb.append("      \"position\": 1,\n");

            if (request.getIncludeAssignments()) {
                sb.append("      \"assignments\": [\n");
                sb.append("        {\n");
                sb.append("          \"title\": \"Assignment Title\",\n");
                sb.append("          \"description\": \"Assignment description\",\n");
                sb.append("          \"assignmentType\": \"FILE_UPLOAD\",\n");
                sb.append("          \"instructions\": \"Detailed instructions\",\n");
                sb.append("          \"position\": 1,\n");
                sb.append("          \"maxPoints\": 100,\n");
                sb.append("          \"timeLimit\": null\n");
                sb.append("        }\n");
                sb.append("      ],\n");
            } else {
                sb.append("      \"assignments\": [],\n");
            }

            if (request.getIncludeQuizzes()) {
                sb.append("      \"quizzes\": [\n");
                sb.append("        {\n");
                sb.append("          \"title\": \"Quiz Title\",\n");
                sb.append("          \"description\": \"Quiz description\",\n");
                sb.append("          \"timeLimit\": 30,\n");
                sb.append("          \"attemptsAllowed\": 2,\n");
                sb.append("          \"shuffleQuestions\": true,\n");
                sb.append("          \"questions\": [\n");
                sb.append("            {\n");
                sb.append("              \"questionText\": \"Question text\",\n");
                sb.append("              \"questionType\": \"MULTIPLE_CHOICE\",\n");
                sb.append("              \"points\": 10,\n");
                sb.append("              \"answerOptions\": [\n");
                sb.append("                {\"text\": \"Option A\", \"isCorrect\": true, \"feedback\": \"Correct!\"},\n");
                sb.append("                {\"text\": \"Option B\", \"isCorrect\": false, \"feedback\": \"Incorrect\"}\n");
                sb.append("              ]\n");
                sb.append("            }\n");
                sb.append("          ]\n");
                sb.append("        }\n");
                sb.append("      ]\n");
            } else {
                sb.append("      \"quizzes\": []\n");
            }

            sb.append("    }\n");
            sb.append("  ]\n");
        } else {
            sb.append("  \"modules\": []\n");
        }

        sb.append("}\n\n");
        sb.append("Guidelines:\n");
        sb.append("- Create realistic and educational content\n");
        sb.append("- Use appropriate academic language\n");
        sb.append("- Provide detailed descriptions and clear instructions\n");
        sb.append("- For modules, create 4-8 modules typically\n");
        sb.append("- For assignments, vary types: FILE_UPLOAD, TEXT, CODE, QUIZ\n");
        sb.append("- For quizzes, create 5-15 questions per quiz\n");
        sb.append("- Question types: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY\n");

        return sb.toString();
    }

    private String buildCourseUserPrompt(CourseGenerationRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Create a course based on this description: ").append(request.getPrompt()).append("\n\n");

        if (request.getAcademicYear() != null) {
            sb.append("Academic year: ").append(request.getAcademicYear()).append("\n");
        }

        sb.append("\nGenerate the complete course structure in JSON format as specified.");

        return sb.toString();
    }

    private String buildEditSystemPrompt(CourseEditRequest request) {
        String language = request.getLanguage().equals("uk") ? "українською" : "in English";

        return "You are an expert educational content editor. " +
               "You will receive existing content and modification instructions. " +
               "Return the modified content as valid JSON in the same structure as provided. " +
               "Make changes according to the instructions while preserving the overall structure. " +
               "Respond " + language + ". " +
               "Entity type: " + request.getEntityType();
    }

    private String buildEditUserPrompt(CourseEditRequest request) {
        return "Current content:\n" + request.getCurrentData() + "\n\n" +
               "Modification instructions: " + request.getPrompt() + "\n\n" +
               "Return the modified content in the same JSON structure.";
    }

    /**
     * Clean JSON response by removing markdown code blocks if present
     */
    private String cleanJsonResponse(String response) {
        if (response == null) {
            return null;
        }

        // Remove markdown code blocks
        response = response.trim();
        if (response.startsWith("```json")) {
            response = response.substring(7);
        } else if (response.startsWith("```")) {
            response = response.substring(3);
        }

        if (response.endsWith("```")) {
            response = response.substring(0, response.length() - 3);
        }

        return response.trim();
    }
}
