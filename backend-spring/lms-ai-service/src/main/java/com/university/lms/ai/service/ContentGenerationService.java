package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.*;
import java.util.Optional;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Service for generating educational content using AI */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentGenerationService {

  private final LlamaApiService llamaApiService;
  private final ObjectMapper objectMapper;
  private final AIGenerationCacheService cacheService;
  private final AiGeneratedContentValidator contentValidator;

  /** Generate a quiz using AI */
  public GeneratedQuizResponse generateQuiz(QuizGenerationRequest request) {
    log.info("Generating quiz for topic: {}", request.getTopic());

    String cacheKey = buildQuizCacheKey(request);

    return generateAndValidate(
        cacheKey,
        GeneratedQuizResponse.class,
        buildQuizSystemPrompt(request),
        buildQuizUserPrompt(request),
        contentValidator::validateQuiz,
        response ->
            "Successfully generated quiz with "
                + (response.getQuestions() != null ? response.getQuestions().size() : 0)
                + " questions",
        "quiz");
  }

  /** Generate an assignment using AI */
  public GeneratedAssignmentResponse generateAssignment(AssignmentGenerationRequest request) {
    log.info("Generating assignment for topic: {}", request.getTopic());

    String cacheKey = buildAssignmentCacheKey(request);

    return generateAndValidate(
        cacheKey,
        GeneratedAssignmentResponse.class,
        buildAssignmentSystemPrompt(request),
        buildAssignmentUserPrompt(request),
        contentValidator::validateAssignment,
        response -> "Successfully generated assignment: " + response.getTitle(),
        "assignment");
  }

  /** Generate a course module using AI */
  public GeneratedModuleResponse generateModule(ModuleGenerationRequest request) {
    log.info("Generating module for topic: {}", request.getTopic());

    String cacheKey = buildModuleCacheKey(request);

    return generateAndValidate(
        cacheKey,
        GeneratedModuleResponse.class,
        buildModuleSystemPrompt(request),
        buildModuleUserPrompt(request),
        contentValidator::validateModule,
        response -> "Successfully generated module: " + response.getTitle(),
        "module");
  }

  private String buildQuizCacheKey(QuizGenerationRequest request) {
    return String.format(
        "quiz:%s:%s:%d:%s",
        request.getTopic(),
        request.getLanguage(),
        request.getQuestionCount(),
        request.getDifficulty());
  }

  private String buildAssignmentCacheKey(AssignmentGenerationRequest request) {
    return String.format(
        "assignment:%s:%s:%s:%s",
        request.getTopic(),
        request.getLanguage(),
        request.getAssignmentType(),
        request.getDifficulty());
  }

  private String buildModuleCacheKey(ModuleGenerationRequest request) {
    return String.format(
        "module:%s:%s:%d:%s",
        request.getTopic(),
        request.getLanguage(),
        request.getWeekDuration(),
        request.getDifficulty());
  }

  private String buildQuizSystemPrompt(QuizGenerationRequest request) {
    String language = "uk".equals(request.getLanguage()) ? "українською" : "in English";

    return String.format(
        """
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
            Do not include additional fields. Respect required fields and size limits.
            Create pedagogically sound questions with clear, unambiguous wording.
            Provide helpful feedback for each answer option.
            """,
        language);
  }

  private String buildQuizUserPrompt(QuizGenerationRequest request) {
    StringBuilder sb = new StringBuilder();
    sb.append("Create a quiz on the topic: ").append(request.getTopic()).append("\n");
    sb.append("Number of questions: ")
        .append(request.getQuestionCount() != null ? request.getQuestionCount() : 10)
        .append("\n");
    sb.append("Difficulty: ")
        .append(request.getDifficulty() != null ? request.getDifficulty() : "medium")
        .append("\n");

    if (request.getQuestionTypes() != null && request.getQuestionTypes().length > 0) {
      sb.append("Question types to include: ")
          .append(String.join(", ", request.getQuestionTypes()))
          .append("\n");
    }

    if (request.getContext() != null) {
      sb.append("Additional context: ").append(request.getContext()).append("\n");
    }

    return sb.toString();
  }

  private String buildAssignmentSystemPrompt(AssignmentGenerationRequest request) {
    String language = "uk".equals(request.getLanguage()) ? "українською" : "in English";

    return String.format(
        """
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
              "learningObjectives": ["Objective 1", "Objective 2"],
              "resources": ["Recommended resource 1", "Recommended resource 2"]
            }

            Assignment types: FILE_UPLOAD, TEXT, CODE, QUIZ
            Do not include additional fields. Respect required fields and size limits.
            Create clear, achievable assignments with detailed instructions.
            Align with learning objectives and provide helpful resources.
            """,
        language);
  }

  private String buildAssignmentUserPrompt(AssignmentGenerationRequest request) {
    StringBuilder sb = new StringBuilder();
    sb.append("Create an assignment on the topic: ").append(request.getTopic()).append("\n");
    sb.append("Assignment type: ")
        .append(request.getAssignmentType() != null ? request.getAssignmentType() : "FILE_UPLOAD")
        .append("\n");
    sb.append("Difficulty: ")
        .append(request.getDifficulty() != null ? request.getDifficulty() : "medium")
        .append("\n");
    sb.append("Maximum points: ")
        .append(request.getMaxPoints() != null ? request.getMaxPoints() : 100)
        .append("\n");

    if (request.getContext() != null) {
      sb.append("Additional context: ").append(request.getContext()).append("\n");
    }

    return sb.toString();
  }

  private String buildModuleSystemPrompt(ModuleGenerationRequest request) {
    String language = "uk".equals(request.getLanguage()) ? "українською" : "in English";

    return String.format(
        """
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
            Do not include additional fields. Respect required fields and size limits.
            Create pedagogically sound, progressive learning experiences.
            """,
        language);
  }

  private String buildModuleUserPrompt(ModuleGenerationRequest request) {
    StringBuilder sb = new StringBuilder();
    sb.append("Create a course module on the topic: ").append(request.getTopic()).append("\n");
    sb.append("Duration: ")
        .append(request.getWeekDuration() != null ? request.getWeekDuration() : 4)
        .append(" weeks\n");
    sb.append("Difficulty: ")
        .append(request.getDifficulty() != null ? request.getDifficulty() : "intermediate")
        .append("\n");

    if (request.getContext() != null) {
      sb.append("Additional context: ").append(request.getContext()).append("\n");
    }

    return sb.toString();
  }

  private <T> T generateAndValidate(
      String cacheKey,
      Class<T> responseClass,
      String systemPrompt,
      String userPrompt,
      Function<T, T> validator,
      Function<T, String> successMessageBuilder,
      String contentType) {
    Optional<String> cached = cacheService.getCached(cacheKey);
    if (cached.isPresent()) {
      try {
        T cachedResponse = objectMapper.readValue(cached.get(), responseClass);
        return validator.apply(cachedResponse);
      } catch (Exception e) {
        log.warn("Failed to parse cached {}, regenerating", contentType, e);
        cacheService.invalidate(cacheKey);
      }
    }

    try {
      String jsonResponse = llamaApiService.generateJson(userPrompt, systemPrompt);
      String cleanedJson = AiJsonResponseCleaner.clean(jsonResponse);

      T response = objectMapper.readValue(cleanedJson, responseClass);
      T validated = validator.apply(response);
      cacheService.cache(cacheKey, cleanedJson);

      log.info(successMessageBuilder.apply(validated));
      return validated;
    } catch (Exception e) {
      log.error("Error generating {}", contentType, e);
      throw new RuntimeException("Failed to generate " + contentType + ": " + e.getMessage(), e);
    }
  }
}
