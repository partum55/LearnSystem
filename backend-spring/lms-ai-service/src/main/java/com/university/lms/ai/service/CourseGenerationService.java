package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.CourseEditRequest;
import com.university.lms.ai.dto.CourseGenerationRequest;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Service for generating course content using AI */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseGenerationService {

  private final LlamaApiService llamaApiService;
  private final ObjectMapper objectMapper;
  private final AIGenerationCacheService cacheService;
  private final AiGeneratedContentValidator contentValidator;

  /** Generate a complete course structure from a prompt */
  public GeneratedCourseResponse generateCourse(CourseGenerationRequest request) {
    log.info("Generating course from prompt: {}", request.getPrompt());

    // Build cache key from request
    String cacheKey = buildCacheKey(request);

    // Check cache first
    Optional<String> cached = cacheService.getCached(cacheKey);
    if (cached.isPresent()) {
      try {
        GeneratedCourseResponse response = objectMapper.readValue(cached.get(), GeneratedCourseResponse.class);
        response = contentValidator.validateCourse(response);
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
      jsonResponse = AiJsonResponseCleaner.clean(jsonResponse);

      GeneratedCourseResponse response = objectMapper.readValue(jsonResponse, GeneratedCourseResponse.class);
      response = contentValidator.validateCourse(response);

      // Cache the result
      cacheService.cache(cacheKey, jsonResponse);

      log.info("Successfully generated course structure");
      return response;

    } catch (Exception e) {
      log.error("Error generating course", e);
      throw new RuntimeException("Failed to generate course: " + e.getMessage(), e);
    }
  }

  /** Edit existing course content with AI */
  public String editCourseContent(CourseEditRequest request) {
    log.info("Editing {} content with prompt: {}", request.getEntityType(), request.getPrompt());

    // Build cache key
    String cacheKey = request.getEntityType()
        + ":"
        + request.getPrompt()
        + ":"
        + (request.getCurrentData() != null ? request.getCurrentData().hashCode() : "");

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
      jsonResponse = AiJsonResponseCleaner.clean(jsonResponse);

      // Cache the result
      cacheService.cache(cacheKey, jsonResponse);

      log.info("Successfully edited {} content", request.getEntityType());
      return jsonResponse;

    } catch (Exception e) {
      log.error("Error editing content", e);
      throw new RuntimeException("Failed to edit content: " + e.getMessage(), e);
    }
  }

  /** Build cache key from request */
  private String buildCacheKey(CourseGenerationRequest request) {
    return String.format(
        "%s|lang:%s|modules:%b|assignments:%b|quizzes:%b|year:%s",
        request.getPrompt(),
        request.getLanguage(),
        request.getIncludeModules(),
        request.getIncludeAssignments(),
        request.getIncludeQuizzes(),
        request.getAcademicYear());
  }

  private String buildCourseSystemPrompt(CourseGenerationRequest request) {
    String language = "uk".equalsIgnoreCase(request.getLanguage()) ? "українською" : "in English";
    boolean includeModules = Boolean.TRUE.equals(request.getIncludeModules());
    boolean includeAssignments = Boolean.TRUE.equals(request.getIncludeAssignments());
    boolean includeQuizzes = Boolean.TRUE.equals(request.getIncludeQuizzes());

    StringBuilder sb = new StringBuilder();
    sb.append(
        "You are an expert educational content creator for a university Learning Management System. ");
    sb.append("Create comprehensive and well-structured course content ")
        .append(language)
        .append(". ");
    sb.append(
        "Your response must be valid JSON matching the CourseExport format. Here is the exact structure:\n\n");
    sb.append("{\n");
    sb.append("  \"version\": \"1.0\",\n");
    sb.append("  \"course\": {\n");
    sb.append("    \"code\": \"COURSE_CODE\",\n");
    sb.append("    \"titleUk\": \"Назва курсу українською\",\n");
    sb.append("    \"titleEn\": \"Course Title in English\",\n");
    sb.append("    \"descriptionUk\": \"Опис українською\",\n");
    sb.append("    \"descriptionEn\": \"Description in English\",\n");
    sb.append("    \"syllabus\": \"Детальний силабус курсу\",\n");
    sb.append("    \"visibility\": \"PRIVATE\",\n");
    sb.append("    \"isPublished\": false,\n");
    sb.append("    \"maxStudents\": 30\n");
    sb.append("  },\n");

    if (includeModules) {
      sb.append("  \"modules\": [\n");
      sb.append("    {\n");
      sb.append("      \"title\": \"Module Title\",\n");
      sb.append("      \"description\": \"Module description\",\n");
      sb.append("      \"position\": 1,\n");
      sb.append("      \"isPublished\": false,\n");
      sb.append("      \"resources\": [\n");
      sb.append("        {\n");
      sb.append("          \"title\": \"Resource Title\",\n");
      sb.append("          \"description\": \"Brief description\",\n");
      sb.append("          \"resourceType\": \"TEXT\",\n");
      sb.append("          \"textContent\": \"Brief lecture content (2-3 sentences)\",\n");
      sb.append("          \"position\": 0\n");
      sb.append("        }\n");
      sb.append("      ],\n");

      if (includeAssignments) {
        sb.append("      \"assignments\": [\n");
        sb.append("        {\n");
        sb.append("          \"title\": \"Assignment Title\",\n");
        sb.append("          \"description\": \"Assignment description\",\n");
        sb.append("          \"assignmentType\": \"FILE_UPLOAD\",\n");
        sb.append("          \"instructions\": \"Detailed instructions\",\n");
        sb.append("          \"maxPoints\": 100,\n");
        sb.append("          \"submissionTypes\": [\"FILE_UPLOAD\"],\n");
        sb.append("          \"tags\": [\"homework\"],\n");
        sb.append("          \"estimatedDuration\": \"2h\",\n");
        sb.append("          \"isPublished\": false\n");
        sb.append("        }\n");
        sb.append("      ]\n");
      } else {
        sb.append("      \"assignments\": []\n");
      }

      sb.append("    }\n");
      sb.append("  ],\n");
    } else {
      sb.append("  \"modules\": [],\n");
    }

    if (includeQuizzes) {
      sb.append("  \"quizzes\": [\n");
      sb.append("    {\n");
      sb.append("      \"title\": \"Quiz Title\",\n");
      sb.append("      \"description\": \"Quiz description\",\n");
      sb.append("      \"moduleTitle\": \"Module Title (required, must match a module title above)\",\n");
      sb.append("      \"timeLimit\": 30,\n");
      sb.append("      \"attemptsAllowed\": 2,\n");
      sb.append("      \"shuffleQuestions\": true,\n");
      sb.append("      \"shuffleAnswers\": true,\n");
      sb.append("      \"passPercentage\": 60,\n");
      sb.append("      \"showCorrectAnswers\": true,\n");
      sb.append("      \"questionRefs\": [\"q1\", \"q2\"]\n");
      sb.append("    }\n");
      sb.append("  ],\n");
      sb.append("  \"questionBank\": [\n");
      sb.append("    {\n");
      sb.append("      \"id\": \"q1\",\n");
      sb.append("      \"stem\": \"Question text here\",\n");
      sb.append("      \"questionType\": \"MULTIPLE_CHOICE\",\n");
      sb.append("      \"points\": 10,\n");
      sb.append("      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n");
      sb.append("      \"correctAnswer\": \"Option A\",\n");
      sb.append("      \"explanation\": \"Why this is correct\"\n");
      sb.append("    }\n");
      sb.append("  ]\n");
    } else {
      sb.append("  \"quizzes\": [],\n");
      sb.append("  \"questionBank\": []\n");
    }

    sb.append("}\n\n");
    sb.append("Guidelines:\n");
    sb.append("1. Create realistic and educational content\n");
    sb.append("2. Use appropriate academic language\n");
    sb.append("3. Provide detailed descriptions and clear instructions\n");
    sb.append(
        "4. CRITICAL: You MUST strictly adhere to any specific counts or constraints requested by the user (e.g., exact number of modules, quizzes, or assignments).\n");
    sb.append(
        "5. If no specific counts are requested, create 4-8 modules, 1-2 assignments per module, 1-2 resources per module, and 1 module-scoped quiz per relevant module.\n");
    sb.append(
        "6. Resource types: TEXT, VIDEO, PDF, SLIDE, LINK, CODE, OTHER. Use TEXT for brief lecture content (2-3 sentences to stay within token limits), LINK for external references.\n");
    sb.append(
        "7. Assignment types: FILE_UPLOAD, TEXT, CODE, URL, QUIZ, MANUAL_GRADE, EXTERNAL. Match submissionTypes to assignmentType (e.g., CODE→[\"CODE\"], FILE_UPLOAD→[\"FILE_UPLOAD\"]).\n");
    sb.append(
        "8. For CODE assignments, include programmingLanguage and optionally starterCode. For FILE_UPLOAD, include allowedFileTypes (e.g., [\".pdf\", \".docx\"]).\n");
    sb.append(
        "9. Question types: MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK, SHORT_ANSWER, ESSAY, CODE, NUMERICAL, MATCHING, ORDERING\n");
    sb.append(
        "10. For MULTIPLE_CHOICE: options is a list of strings, correctAnswer is the correct string. For TRUE_FALSE: options=[\"True\",\"False\"], correctAnswer=\"True\" or \"False\".\n");
    sb.append(
        "11. Each question in questionBank must have a unique \"id\" (e.g., \"q1\",\"q2\"). Quizzes reference questions via \"questionRefs\" array.\n");
    sb.append(
        "12. Quizzes are module-bound. Every quiz MUST include moduleTitle that matches one generated module.\n");
    sb.append("13. For quizzes, create 5-15 questions per quiz.\n");
    sb.append("14. Do not include standalone course-level quizzes without a module reference.\n");
    sb.append("15. Do not include extra fields; honor required fields and size limits.\n");

    return sb.toString();
  }

  private String buildCourseUserPrompt(CourseGenerationRequest request) {
    StringBuilder sb = new StringBuilder();
    sb.append("Create a course based on this description: ")
        .append(request.getPrompt())
        .append("\n\n");

    if (request.getAcademicYear() != null) {
      sb.append("Academic year: ").append(request.getAcademicYear()).append("\n");
    }

    sb.append("\nGenerate the complete course structure in JSON format as specified.");
    sb.append(
        "\nCRITICAL: Double-check that you have generated EXACTLY the number of modules, assignments, and quizzes requested in the description. Do NOT generate more or fewer items than requested.");

    return sb.toString();
  }

  private String buildEditSystemPrompt(CourseEditRequest request) {
    String language = "uk".equalsIgnoreCase(request.getLanguage()) ? "українською" : "in English";

    return "You are an expert educational content editor. "
        + "You will receive existing content and modification instructions. "
        + "Return the modified content as valid JSON in the same structure as provided. "
        + "Make changes according to the instructions while preserving the overall structure. "
        + "Respond "
        + language
        + ". "
        + "Entity type: "
        + request.getEntityType();
  }

  private String buildEditUserPrompt(CourseEditRequest request) {
    return "Current content:\n"
        + request.getCurrentData()
        + "\n\n"
        + "Modification instructions: "
        + request.getPrompt()
        + "\n\n"
        + "Return the modified content in the same JSON structure.";
  }
}
