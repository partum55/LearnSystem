package com.university.lms.ai.web;

import com.university.lms.ai.dto.AIProgressEvent;
import com.university.lms.ai.dto.AiCourseConfirmationRequest;
import com.university.lms.ai.dto.CourseEditRequest;
import com.university.lms.ai.dto.CourseGenerationRequest;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.exception.AiContentValidationException;
import com.university.lms.ai.service.CourseGenerationService;
import com.university.lms.ai.service.CoursePersistenceService;
import com.university.lms.ai.service.StreamingGenerationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/** REST controller for AI-powered course generation. API Version: v1 */
@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
public class AiCourseController {

  private final CourseGenerationService courseGenerationService;
  private final CoursePersistenceService coursePersistenceService;
  private final StreamingGenerationService streamingGenerationService;
  private final HttpServletRequest request;

  /**
   * Generate course structure from prompt (preview only, not saved)
   *
   * <p>POST /api/ai/courses/generate
   */
  @PostMapping("/courses/generate")
  public ResponseEntity<GeneratedCourseResponse> generateCourse(
      @Valid @RequestBody CourseGenerationRequest request) {

    log.info("Received course generation request");
    GeneratedCourseResponse response = courseGenerationService.generateCourse(request);
    return ResponseEntity.ok(response);
  }

  /**
   * Generate course with streaming progress updates
   *
   * <p>POST /api/ai/courses/generate-stream
   */
  @PostMapping(value = "/courses/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<AIProgressEvent> generateCourseStream(
      @Valid @RequestBody CourseGenerationRequest request) {

    log.info("Received streaming course generation request");
    return streamingGenerationService.generateCourseWithProgress(request);
  }

  /**
   * Generate modules with streaming
   *
   * <p>POST /api/ai/modules/generate-stream
   */
  @PostMapping(value = "/modules/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<AIProgressEvent> generateModulesStream(
      @RequestParam String courseId,
      @RequestParam String prompt,
      @RequestParam(defaultValue = "4") int moduleCount) {

    log.info("Streaming module generation for course: {}", courseId);
    return streamingGenerationService.generateModulesWithProgress(courseId, prompt, moduleCount);
  }

  /**
   * Generate and save course structure to database
   *
   * <p>POST /api/ai/courses/generate-and-save
   */
  @PostMapping("/courses/generate-and-save")
  public ResponseEntity<Map<String, Object>> generateAndSaveCourse(
      @Valid @RequestBody CourseGenerationRequest courseRequest,
      @RequestHeader("Authorization") String authToken,
      @RequestParam(defaultValue = "false") boolean confirmed) {

    UUID userId = getAuthenticatedUserId();
    log.info("Received course generation and save request from user: {}", userId);
    if (!confirmed) {
      throw new AiContentValidationException(
          "course", java.util.List.of("User confirmation is required before saving"));
    }

    // Generate course structure
    GeneratedCourseResponse generatedCourse = courseGenerationService.generateCourse(courseRequest);

    // Save to database
    Map<String, Object> result =
        coursePersistenceService.saveGeneratedCourse(generatedCourse, userId, authToken);

    return ResponseEntity.status(HttpStatus.CREATED).body(result);
  }

  /**
   * Confirm and save user-reviewed course content
   *
   * <p>POST /api/ai/courses/confirm-save
   */
  @PostMapping("/courses/confirm-save")
  public ResponseEntity<Map<String, Object>> confirmAndSaveCourse(
      @Valid @RequestBody AiCourseConfirmationRequest confirmationRequest,
      @RequestHeader("Authorization") String authToken) {

    UUID userId = getAuthenticatedUserId();
    log.info("Received course confirmation request from user: {}", userId);

    if (!Boolean.TRUE.equals(confirmationRequest.getConfirmed())) {
      throw new AiContentValidationException(
          "course", java.util.List.of("User confirmation is required before saving"));
    }

    Map<String, Object> result =
        coursePersistenceService.saveGeneratedCourse(
            confirmationRequest.getPayload(), userId, authToken);

    return ResponseEntity.status(HttpStatus.CREATED).body(result);
  }

  /**
   * Edit existing course content with AI
   *
   * <p>POST /api/ai/content/edit
   */
  @PostMapping("/content/edit")
  public ResponseEntity<String> editContent(@Valid @RequestBody CourseEditRequest request) {

    log.info("Received content edit request for entity type: {}", request.getEntityType());
    String editedContent = courseGenerationService.editCourseContent(request);
    return ResponseEntity.ok(editedContent);
  }

  /**
   * Generate only modules for existing course
   *
   * <p>POST /api/ai/modules/generate
   */
  @PostMapping("/modules/generate")
  public ResponseEntity<Map<String, Object>> generateModules(
      @RequestParam UUID courseId,
      @RequestParam String prompt,
      @RequestParam(defaultValue = "uk") String language,
      @RequestParam(defaultValue = "4") int moduleCount) {

    log.info("Generating {} modules for course: {}", moduleCount, courseId);

    CourseGenerationRequest request =
        CourseGenerationRequest.builder()
            .prompt(prompt + " (Створи " + moduleCount + " модулів)")
            .language(language)
            .includeModules(true)
            .includeAssignments(false)
            .includeQuizzes(false)
            .build();

    GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

    return ResponseEntity.ok(Map.of("courseId", courseId, "modules", response.getModules()));
  }

  /**
   * Generate assignments for a module
   *
   * <p>POST /api/ai/assignments/generate
   */
  @PostMapping("/assignments/generate")
  public ResponseEntity<Map<String, Object>> generateAssignments(
      @RequestParam UUID moduleId,
      @RequestParam String moduleTopic,
      @RequestParam(defaultValue = "uk") String language,
      @RequestParam(defaultValue = "3") int assignmentCount) {

    log.info("Generating {} assignments for module: {}", assignmentCount, moduleId);

    String prompt = "Створи " + assignmentCount + " завдання для модуля на тему: " + moduleTopic;

    CourseGenerationRequest request =
        CourseGenerationRequest.builder()
            .prompt(prompt)
            .language(language)
            .includeModules(true)
            .includeAssignments(true)
            .includeQuizzes(false)
            .build();

    GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

    return ResponseEntity.ok(
        Map.of(
            "moduleId",
            moduleId,
            "assignments",
            response.getModules().isEmpty()
                ? java.util.Collections.emptyList()
                : response.getModules().get(0).getAssignments()));
  }

  /**
   * Generate quiz with questions
   *
   * <p>POST /api/ai/quizzes/generate
   */
  @PostMapping("/quizzes/generate")
  public ResponseEntity<Map<String, Object>> generateQuiz(
      @RequestParam UUID moduleId,
      @RequestParam String topic,
      @RequestParam(defaultValue = "uk") String language,
      @RequestParam(defaultValue = "10") int questionCount,
      @RequestParam(defaultValue = "30") int timeLimit) {

    log.info("Generating quiz with {} questions for module: {}", questionCount, moduleId);

    String prompt = "Створи квіз з " + questionCount + " питань на тему: " + topic;

    CourseGenerationRequest request =
        CourseGenerationRequest.builder()
            .prompt(prompt)
            .language(language)
            .includeModules(true)
            .includeAssignments(false)
            .includeQuizzes(true)
            .build();

    GeneratedCourseResponse response = courseGenerationService.generateCourse(request);

    return ResponseEntity.ok(
        Map.of(
            "moduleId",
            moduleId,
            "quizzes",
            response.getQuizzes() == null || response.getQuizzes().isEmpty()
                ? java.util.Collections.emptyList()
                : response.getQuizzes()));
  }

  private UUID getAuthenticatedUserId() {
    Object userId = request.getAttribute("userId");
    if (userId instanceof UUID) {
      return (UUID) userId;
    }
    throw new IllegalStateException("User ID not available in request");
  }
}
