package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Service for generating educational content using AI
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentGenerationService {

    private final LlamaApiService llamaApiService;
    private final ObjectMapper objectMapper;
    private final AIGenerationCacheService cacheService;

    /**
     * Generate a quiz using AI
     */
    public GeneratedQuizResponse generateQuiz(QuizGenerationRequest request) {
        log.info("Generating quiz for topic: {}", request.getTopic());

        String cacheKey = buildQuizCacheKey(request);
        
        Optional<String> cached = cacheService.getCached(cacheKey);
        if (cached.isPresent()) {
            try {
                return objectMapper.readValue(cached.get(), GeneratedQuizResponse.class);
            } catch (Exception e) {
                log.warn("Failed to parse cached quiz, regenerating", e);
                cacheService.invalidate(cacheKey);
            }
        }

        String systemPrompt = buildQuizSystemPrompt(request);
        String userPrompt = buildQuizUserPrompt(request);

        try {
            String jsonResponse = llamaApiService.generateJson(userPrompt, systemPrompt);
            jsonResponse = cleanJsonResponse(jsonResponse);
            
            GeneratedQuizResponse response = objectMapper.readValue(jsonResponse, GeneratedQuizResponse.class);
            cacheService.cache(cacheKey, jsonResponse);
            
            log.info("Successfully generated quiz with {} questions", response.getQuestions().size());
            return response;
        } catch (Exception e) {
            log.error("Error generating quiz", e);
            throw new RuntimeException("Failed to generate quiz: " + e.getMessage(), e);
        }
    }

    /**
     * Generate an assignment using AI
     */
    public GeneratedAssignmentResponse generateAssignment(AssignmentGenerationRequest request) {
        log.info("Generating assignment for topic: {}", request.getTopic());

        String cacheKey = buildAssignmentCacheKey(request);
        
        Optional<String> cached = cacheService.getCached(cacheKey);
        if (cached.isPresent()) {
            try {
                return objectMapper.readValue(cached.get(), GeneratedAssignmentResponse.class);
            } catch (Exception e) {
                log.warn("Failed to parse cached assignment, regenerating", e);
                cacheService.invalidate(cacheKey);
            }
        }

        String systemPrompt = buildAssignmentSystemPrompt(request);
        String userPrompt = buildAssignmentUserPrompt(request);

        try {
            String jsonResponse = llamaApiService.generateJson(userPrompt, systemPrompt);
            jsonResponse = cleanJsonResponse(jsonResponse);
            
            GeneratedAssignmentResponse response = objectMapper.readValue(jsonResponse, GeneratedAssignmentResponse.class);
            cacheService.cache(cacheKey, jsonResponse);
            
            log.info("Successfully generated assignment: {}", response.getTitle());
            return response;
        } catch (Exception e) {
            log.error("Error generating assignment", e);
            throw new RuntimeException("Failed to generate assignment: " + e.getMessage(), e);
        }
    }

    /**
     * Generate a course module using AI
     */
    public GeneratedModuleResponse generateModule(ModuleGenerationRequest request) {
        log.info("Generating module for topic: {}", request.getTopic());

        String cacheKey = buildModuleCacheKey(request);
        
        Optional<String> cached = cacheService.getCached(cacheKey);
        if (cached.isPresent()) {
            try {
                return objectMapper.readValue(cached.get(), GeneratedModuleResponse.class);
            } catch (Exception e) {
                log.warn("Failed to parse cached module, regenerating", e);
                cacheService.invalidate(cacheKey);
            }
        }

        String systemPrompt = buildModuleSystemPrompt(request);
        String userPrompt = buildModuleUserPrompt(request);

        try {
            String jsonResponse = llamaApiService.generateJson(userPrompt, systemPrompt);
            jsonResponse = cleanJsonResponse(jsonResponse);
            
            GeneratedModuleResponse response = objectMapper.readValue(jsonResponse, GeneratedModuleResponse.class);
            cacheService.cache(cacheKey, jsonResponse);
            
            log.info("Successfully generated module: {}", response.getTitle());
            return response;
        } catch (Exception e) {
            log.error("Error generating module", e);
            throw new RuntimeException("Failed to generate module: " + e.getMessage(), e);
        }
    }

    private String buildQuizCacheKey(QuizGenerationRequest request) {
        return String.format("quiz:%s:%s:%d:%s", 
            request.getTopic(), request.getLanguage(), 
            request.getQuestionCount(), request.getDifficulty());
    }

    private String buildAssignmentCacheKey(AssignmentGenerationRequest request) {
        return String.format("assignment:%s:%s:%s:%s", 
            request.getTopic(), request.getLanguage(), 
            request.getAssignmentType(), request.getDifficulty());
    }

    private String buildModuleCacheKey(ModuleGenerationRequest request) {
        return String.format("module:%s:%s:%d:%s", 
            request.getTopic(), request.getLanguage(), 
            request.getWeekDuration(), request.getDifficulty());
    }

    private String buildQuizSystemPrompt(QuizGenerationRequest request) {
        String language = "uk".equals(request.getLanguage()) ? "українською" : "in English";
        
        return String.format("""
            You are an expert educational assessment creator for a university Learning Management System.
            Create a high-quality quiz %s.
            
            Return valid JSON matching this structure:
            {
              "title": "Quiz title",
              "description": "Quiz description",
              "timeLimit": 30,
              "attemptsAllowed": 2,
              "questions": [
                {
                  "questionText": "Question text here",
                  "questionType": "MULTIPLE_CHOICE",
                  "points": 10,
                  "answerOptions": [
                    {"text": "Option A", "isCorrect": true, "feedback": "Correct feedback"},
                    {"text": "Option B", "isCorrect": false, "feedback": "Incorrect feedback"}
                  ],
                  "explanation": "Explanation of the correct answer"
                }
              ]
            }
            
            Question types: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY, MATCHING, FILL_BLANK
            Difficulty levels: easy, medium, hard
            Create pedagogically sound questions with clear, unambiguous wording.
            Provide helpful feedback for each answer option.
            """, language);
    }

    private String buildQuizUserPrompt(QuizGenerationRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Create a quiz on the topic: ").append(request.getTopic()).append("\n");
        sb.append("Number of questions: ").append(request.getQuestionCount() != null ? request.getQuestionCount() : 10).append("\n");
        sb.append("Difficulty: ").append(request.getDifficulty() != null ? request.getDifficulty() : "medium").append("\n");
        
        if (request.getQuestionTypes() != null && request.getQuestionTypes().length > 0) {
            sb.append("Question types to include: ").append(String.join(", ", request.getQuestionTypes())).append("\n");
        }
        
        if (request.getContext() != null) {
            sb.append("Additional context: ").append(request.getContext()).append("\n");
        }
        
        return sb.toString();
    }

    private String buildAssignmentSystemPrompt(AssignmentGenerationRequest request) {
        String language = "uk".equals(request.getLanguage()) ? "українською" : "in English";
        
        String rubricSection = request.getIncludeRubric() != null && request.getIncludeRubric() ? 
            """
              "rubric": {
                "criteria": [
                  {
                    "name": "Criterion name",
                    "description": "What is being evaluated",
                    "maxPoints": 25,
                    "levels": [
                      {"name": "Excellent", "points": 25, "description": "Exceeds expectations"},
                      {"name": "Good", "points": 20, "description": "Meets expectations"},
                      {"name": "Satisfactory", "points": 15, "description": "Partially meets expectations"},
                      {"name": "Poor", "points": 10, "description": "Does not meet expectations"}
                    ]
                  }
                ]
              },
            """ : "";
        
        return String.format("""
            You are an expert educational content creator for a university Learning Management System.
            Create a comprehensive assignment %s.
            
            Return valid JSON matching this structure:
            {
              "title": "Assignment title",
              "description": "Brief description",
              "instructions": "Detailed step-by-step instructions",
              "assignmentType": "FILE_UPLOAD",
              "maxPoints": 100,
              "timeLimit": null,
              %s
              "learningObjectives": ["Objective 1", "Objective 2"],
              "resources": ["Recommended resource 1", "Recommended resource 2"]
            }
            
            Assignment types: FILE_UPLOAD, TEXT, CODE, QUIZ
            Create clear, achievable assignments with detailed instructions.
            Align with learning objectives and provide helpful resources.
            """, language, rubricSection);
    }

    private String buildAssignmentUserPrompt(AssignmentGenerationRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Create an assignment on the topic: ").append(request.getTopic()).append("\n");
        sb.append("Assignment type: ").append(request.getAssignmentType() != null ? request.getAssignmentType() : "FILE_UPLOAD").append("\n");
        sb.append("Difficulty: ").append(request.getDifficulty() != null ? request.getDifficulty() : "medium").append("\n");
        sb.append("Maximum points: ").append(request.getMaxPoints() != null ? request.getMaxPoints() : 100).append("\n");
        
        if (request.getContext() != null) {
            sb.append("Additional context: ").append(request.getContext()).append("\n");
        }
        
        return sb.toString();
    }

    private String buildModuleSystemPrompt(ModuleGenerationRequest request) {
        String language = "uk".equals(request.getLanguage()) ? "українською" : "in English";
        
        return String.format("""
            You are an expert curriculum designer for a university Learning Management System.
            Create a comprehensive course module %s.
            
            Return valid JSON matching this structure:
            {
              "title": "Module title",
              "description": "Module overview",
              "learningObjectives": ["Objective 1", "Objective 2"],
              "weeks": [
                {
                  "weekNumber": 1,
                  "title": "Week title",
                  "description": "What students will learn",
                  "topics": ["Topic 1", "Topic 2"],
                  "activities": [
                    {
                      "type": "lecture",
                      "title": "Activity title",
                      "description": "Activity description",
                      "duration": 60
                    }
                  ],
                  "readings": ["Reading 1", "Reading 2"]
                }
              ],
              "assessmentStrategies": ["Strategy 1", "Strategy 2"],
              "recommendedResources": [
                {
                  "type": "book",
                  "title": "Resource title",
                  "description": "Why this is useful",
                  "url": "optional URL"
                }
              ]
            }
            
            Activity types: lecture, discussion, lab, project, workshop, quiz
            Resource types: book, article, video, website, tool
            Create pedagogically sound, progressive learning experiences.
            """, language);
    }

    private String buildModuleUserPrompt(ModuleGenerationRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Create a course module on the topic: ").append(request.getTopic()).append("\n");
        sb.append("Duration: ").append(request.getWeekDuration() != null ? request.getWeekDuration() : 4).append(" weeks\n");
        sb.append("Difficulty: ").append(request.getDifficulty() != null ? request.getDifficulty() : "intermediate").append("\n");
        
        if (request.getContext() != null) {
            sb.append("Additional context: ").append(request.getContext()).append("\n");
        }
        
        return sb.toString();
    }

    private String cleanJsonResponse(String response) {
        if (response == null) return null;
        
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
