package com.university.lms.ai.web;

import com.university.lms.ai.dto.*;
import com.university.lms.ai.service.ContentGenerationService;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** REST controller for AI content generation. API Version: v1 */
@RestController
@RequestMapping("/v1/ai/generate")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
public class ContentGenerationController {

  private static final String DEFAULT_LANGUAGE = "en";

  private final ContentGenerationService contentGenerationService;

  /** Generate a quiz using AI */
  @PostMapping("/quiz")
  public ResponseEntity<GeneratedQuizResponse> generateQuiz(
      @RequestBody QuizGenerationRequest request) {
    log.info("Received quiz generation request for topic: {}", request.getTopic());
    applyQuizDefaults(request);
    GeneratedQuizResponse response = contentGenerationService.generateQuiz(request);
    return ResponseEntity.ok(response);
  }

  /** Generate an assignment using AI */
  @PostMapping("/assignment")
  public ResponseEntity<GeneratedAssignmentResponse> generateAssignment(
      @RequestBody AssignmentGenerationRequest request) {
    log.info("Received assignment generation request for topic: {}", request.getTopic());
    applyAssignmentDefaults(request);
    GeneratedAssignmentResponse response = contentGenerationService.generateAssignment(request);
    return ResponseEntity.ok(response);
  }

  /** Generate a course module using AI */
  @PostMapping("/module")
  public ResponseEntity<GeneratedModuleResponse> generateModule(
      @RequestBody ModuleGenerationRequest request) {
    log.info("Received module generation request for topic: {}", request.getTopic());
    applyModuleDefaults(request);
    GeneratedModuleResponse response = contentGenerationService.generateModule(request);
    return ResponseEntity.ok(response);
  }

  private void applyQuizDefaults(QuizGenerationRequest request) {
    request.setLanguage(normalizeLanguage(request.getLanguage()));
    request.setQuestionCount(defaultIfNull(request.getQuestionCount(), 10));
    request.setDifficulty(defaultIfBlank(request.getDifficulty(), "medium"));
  }

  private void applyAssignmentDefaults(AssignmentGenerationRequest request) {
    request.setLanguage(normalizeLanguage(request.getLanguage()));
    request.setAssignmentType(defaultIfBlank(request.getAssignmentType(), "FILE_UPLOAD"));
    request.setDifficulty(defaultIfBlank(request.getDifficulty(), "medium"));
    request.setMaxPoints(defaultIfNull(request.getMaxPoints(), 100));
  }

  private void applyModuleDefaults(ModuleGenerationRequest request) {
    request.setLanguage(normalizeLanguage(request.getLanguage()));
    request.setWeekDuration(defaultIfNull(request.getWeekDuration(), 4));
    request.setDifficulty(defaultIfBlank(request.getDifficulty(), "intermediate"));
    request.setIncludeLearningObjectives(
        defaultIfNull(request.getIncludeLearningObjectives(), true));
    request.setIncludeReadingMaterials(defaultIfNull(request.getIncludeReadingMaterials(), true));
    request.setIncludeActivities(defaultIfNull(request.getIncludeActivities(), true));
  }

  private String normalizeLanguage(String language) {
    return defaultIfBlank(language, DEFAULT_LANGUAGE).toLowerCase(Locale.ROOT);
  }

  private <T> T defaultIfNull(T value, T defaultValue) {
    return value == null ? defaultValue : value;
  }

  private String defaultIfBlank(String value, String defaultValue) {
    return (value == null || value.isBlank()) ? defaultValue : value;
  }
}
