package com.university.lms.ai.service;

import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.dto.persistence.AiAssignmentCreateRequest;
import com.university.lms.ai.dto.persistence.AiCourseCreateRequest;
import com.university.lms.ai.dto.persistence.AiModuleCreateRequest;
import com.university.lms.ai.dto.persistence.AiQuestionCreateRequest;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/** Service for persisting AI-generated content via learning-service endpoints. */
@Service
@RequiredArgsConstructor
@Slf4j
public class CoursePersistenceService {
  private static final ParameterizedTypeReference<Map<String, Object>> MAP_RESPONSE_TYPE =
      new ParameterizedTypeReference<>() {};

  private final AiGeneratedContentValidator contentValidator;
  private final AiCoursePersistenceMapper persistenceMapper;
  private final WebClient.Builder webClientBuilder;

  @Value("${services.learning-service.url:http://localhost:8089}")
  private String learningServiceUrl;

  /** Save generated course with all modules, assignments, and quizzes */
  @Transactional(rollbackFor = Exception.class)
  public Map<String, Object> saveGeneratedCourse(
      GeneratedCourseResponse response, UUID ownerId, String authToken) {
    log.info("Saving generated course to database");

    GeneratedCourseResponse validated = contentValidator.validateCourse(response);
    PersistenceContext context = new PersistenceContext();

    try {
      // 1. Create the course
      AiCourseCreateRequest courseRequest =
          persistenceMapper.toCourseCreateRequest(validated.getCourse(), ownerId);
      Map<String, Object> savedCourse = createCourse(courseRequest, authToken);
      UUID courseId = UUID.fromString(savedCourse.get("id").toString());
      context.courseId = courseId;
      context.savedCourse = savedCourse;

      log.info("Created course with ID: {}", courseId);

      // 2. Create modules with assignments
      if (validated.getModules() != null) {
        for (GeneratedCourseResponse.ModuleData moduleData : validated.getModules()) {
          Map<String, Object> savedModule = createModule(courseId, moduleData, authToken);
          UUID moduleId = UUID.fromString(savedModule.get("id").toString());
          context.modules.add(new PersistedModule(moduleId, moduleData, savedModule));

          log.info("Created module with ID: {}", moduleId);

          // 3. Create assignments for this module
          if (moduleData.getAssignments() != null) {
            for (GeneratedCourseResponse.AssignmentData assignmentData :
                moduleData.getAssignments()) {
              Map<String, Object> savedAssignment =
                  createAssignment(courseId, moduleId, assignmentData, authToken);
              UUID assignmentId = UUID.fromString(savedAssignment.get("id").toString());
              context.assignments.add(
                  new PersistedAssignment(assignmentId, moduleId, assignmentData, savedAssignment));
            }
          }
        }
      }

      // 4. Create module-scoped quizzes with questions from questionBank
      if (validated.getQuizzes() != null) {
        for (GeneratedCourseResponse.QuizData quizData : validated.getQuizzes()) {
          UUID targetModuleId = resolveModuleIdForQuiz(quizData, context.modules);
          PersistedQuiz persistedQuiz =
              createQuiz(courseId, targetModuleId, quizData, validated.getQuestionBank(), authToken);
          context.quizzes.add(persistedQuiz);
        }
      }

      VerificationResult verification = verifyPersistedCourse(context, validated, authToken);

      return Map.of(
          "course",
          context.savedCourse,
          "modules",
          context.modules.stream().map(PersistedModule::savedModule).toList(),
          "verification",
          verification.toMap(),
          "message",
          verification.matches
              ? "Course successfully created with all content"
              : "Course created with verification warnings");
    } catch (Exception e) {
      log.error("Error saving generated course, attempting rollback", e);
      rollbackCreatedResources(context, authToken);
      throw new RuntimeException("Failed to save generated course: " + e.getMessage(), e);
    }
  }

  private Map<String, Object> createCourse(AiCourseCreateRequest courseData, String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    return webClient
        .post()
        .uri("/courses")
        .header("Authorization", authToken)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(courseData)
        .retrieve()
        .onStatus(
            status -> status.value() != HttpStatus.CREATED.value(),
            clientResponse -> Mono.error(new RuntimeException("Failed to create course")))
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private Map<String, Object> createModule(
      UUID courseId, GeneratedCourseResponse.ModuleData moduleData, String authToken) {
    AiModuleCreateRequest moduleRequest =
        persistenceMapper.toModuleCreateRequest(courseId, moduleData);
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    return webClient
        .post()
        .uri("/courses/{courseId}/modules", courseId)
        .header("Authorization", authToken)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(moduleRequest)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private Map<String, Object> createAssignment(
      UUID courseId,
      UUID moduleId,
      GeneratedCourseResponse.AssignmentData assignmentData,
      String authToken) {
    AiAssignmentCreateRequest assignmentRequest =
        persistenceMapper.toAssignmentCreateRequest(courseId, moduleId, assignmentData);
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    Map<String, Object> savedAssignment =
        webClient
            .post()
            .uri("/assignments")
            .header("Authorization", authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(assignmentRequest)
            .retrieve()
            .bodyToMono(MAP_RESPONSE_TYPE)
            .block();

    log.info("Created assignment: {}", assignmentData.getTitle());
    return savedAssignment;
  }

  private PersistedQuiz createQuiz(
      UUID courseId,
      UUID moduleId,
      GeneratedCourseResponse.QuizData quizData,
      List<GeneratedCourseResponse.QuestionData> questionBank,
      String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    Map<String, Object> inlineQuiz = new HashMap<>();
    inlineQuiz.put("title", quizData.getTitle());
    inlineQuiz.put("description", quizData.getDescription());
    if (quizData.getTimeLimit() != null) {
      inlineQuiz.put("timeLimit", quizData.getTimeLimit());
    }
    if (quizData.getAttemptsAllowed() != null) {
      inlineQuiz.put("attemptsAllowed", quizData.getAttemptsAllowed());
    }
    if (quizData.getShuffleQuestions() != null) {
      inlineQuiz.put("shuffleQuestions", quizData.getShuffleQuestions());
    }
    if (quizData.getShuffleAnswers() != null) {
      inlineQuiz.put("shuffleAnswers", quizData.getShuffleAnswers());
    }
    if (quizData.getPassPercentage() != null) {
      inlineQuiz.put("passPercentage", quizData.getPassPercentage());
    }
    if (quizData.getShowCorrectAnswers() != null) {
      inlineQuiz.put("showCorrectAnswers", quizData.getShowCorrectAnswers());
    }

    Map<String, Object> assignmentPayload = new HashMap<>();
    assignmentPayload.put("courseId", courseId.toString());
    assignmentPayload.put("moduleId", moduleId.toString());
    assignmentPayload.put("assignmentType", "QUIZ");
    assignmentPayload.put("title", quizData.getTitle());
    assignmentPayload.put("description", Optional.ofNullable(quizData.getDescription()).orElse(""));
    assignmentPayload.put("maxPoints", 100);
    assignmentPayload.put("isPublished", false);
    assignmentPayload.put("quiz", inlineQuiz);

    Map<String, Object> savedAssignment =
        webClient
            .post()
            .uri("/assignments")
            .header("Authorization", authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(assignmentPayload)
            .retrieve()
            .bodyToMono(MAP_RESPONSE_TYPE)
            .block();

    Object rawQuizId = savedAssignment.get("quizId");
    if (rawQuizId == null) {
      rawQuizId = savedAssignment.get("quiz_id");
    }
    if (rawQuizId == null) {
      throw new RuntimeException("QUIZ assignment created without quizId in response");
    }

    UUID quizId = UUID.fromString(rawQuizId.toString());
    UUID assignmentId = UUID.fromString(savedAssignment.get("id").toString());
    Map<String, Object> savedQuiz = fetchQuiz(quizId, authToken);

    log.info("Created quiz with ID: {}", quizId);

    updateQuizSettings(quizId, quizData, authToken);

    PersistedQuiz persistedQuiz =
        new PersistedQuiz(quizId, assignmentId, moduleId, quizData, savedQuiz);

    // Resolve questions from questionBank via questionRefs
    if (quizData.getQuestionRefs() != null && questionBank != null) {
      int position = 0;
      for (String ref : quizData.getQuestionRefs()) {
        GeneratedCourseResponse.QuestionData questionData =
            questionBank.stream()
                .filter(q -> ref.equals(q.getId()))
                .findFirst()
                .orElse(null);
        if (questionData != null) {
          PersistedQuestion persistedQuestion =
              createQuizQuestion(courseId, quizId, questionData, position, authToken);
          persistedQuiz.questions.add(persistedQuestion);
          position++;
        } else {
          log.warn("Quiz '{}' references unknown question id '{}'", quizData.getTitle(), ref);
        }
      }
    }
    return persistedQuiz;
  }

  private UUID resolveModuleIdForQuiz(
      GeneratedCourseResponse.QuizData quizData, List<PersistedModule> persistedModules) {
    if (persistedModules == null || persistedModules.isEmpty()) {
      throw new RuntimeException("Cannot create quiz without at least one module");
    }

    String requestedModuleTitle = quizData.getModuleTitle();
    if (requestedModuleTitle == null || requestedModuleTitle.isBlank()) {
      return persistedModules.get(0).moduleId();
    }

    String normalizedRequested = requestedModuleTitle.trim();
    return persistedModules.stream()
        .filter(module -> {
          String moduleTitle = module.source().getTitle();
          return moduleTitle != null && moduleTitle.trim().equalsIgnoreCase(normalizedRequested);
        })
        .map(PersistedModule::moduleId)
        .findFirst()
        .orElseGet(
            () -> {
              log.warn(
                  "Quiz '{}' references unknown moduleTitle '{}'; falling back to first module",
                  quizData.getTitle(),
                  requestedModuleTitle);
              return persistedModules.get(0).moduleId();
            });
  }

  private void updateQuizSettings(
      UUID quizId, GeneratedCourseResponse.QuizData quizData, String authToken) {
    Map<String, Object> updates = new HashMap<>();
    updates.put("timeLimit", quizData.getTimeLimit());
    updates.put("attemptsAllowed", quizData.getAttemptsAllowed());
    updates.put("shuffleQuestions", quizData.getShuffleQuestions());
    updates.put("shuffleAnswers", quizData.getShuffleAnswers());
    updates.put("passPercentage", quizData.getPassPercentage());
    updates.put("showCorrectAnswers", quizData.getShowCorrectAnswers());
    updates.values().removeIf(Objects::isNull);
    if (updates.isEmpty()) {
      return;
    }

    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    webClient
        .put()
        .uri("/quizzes/{quizId}", quizId)
        .header("Authorization", authToken)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(updates)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private PersistedQuestion createQuizQuestion(
      UUID courseId,
      UUID quizId,
      GeneratedCourseResponse.QuestionData questionData,
      int position,
      String authToken) {
    AiQuestionCreateRequest questionRequest =
        persistenceMapper.toQuestionCreateRequest(courseId, questionData);
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    Map<String, Object> savedQuestion =
        webClient
            .post()
            .uri("/questions")
            .header("Authorization", authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(questionRequest)
            .retrieve()
            .bodyToMono(MAP_RESPONSE_TYPE)
            .block();

    UUID questionId = UUID.fromString(savedQuestion.get("id").toString());

    webClient
        .post()
        .uri(
            uriBuilder ->
                uriBuilder
                    .path("/quizzes/{quizId}/questions/{questionId}")
                    .queryParam("position", position)
                    .build(quizId, questionId))
        .header("Authorization", authToken)
        .retrieve()
        .bodyToMono(Void.class)
        .block();

    log.debug("Created quiz question: {}", questionData.getStem());
    return new PersistedQuestion(questionId, questionData, savedQuestion);
  }

  private VerificationResult verifyPersistedCourse(
      PersistenceContext context, GeneratedCourseResponse source, String authToken) {
    VerificationResult result = new VerificationResult();
    if (context.courseId == null) {
      result.addMismatch("course", "No course persisted");
      return result;
    }

    Map<String, Object> persistedCourse = fetchCourse(context.courseId, authToken);
    compareField(result, "course.code", source.getCourse().getCode(), persistedCourse.get("code"));
    compareField(
        result, "course.titleUk", source.getCourse().getTitleUk(), persistedCourse.get("titleUk"));
    compareField(
        result, "course.titleEn", source.getCourse().getTitleEn(), persistedCourse.get("titleEn"));
    compareField(
        result,
        "course.descriptionUk",
        source.getCourse().getDescriptionUk(),
        persistedCourse.get("descriptionUk"));
    compareField(
        result,
        "course.descriptionEn",
        source.getCourse().getDescriptionEn(),
        persistedCourse.get("descriptionEn"));

    for (PersistedModule module : context.modules) {
      Map<String, Object> persistedModule =
          fetchModule(context.courseId, module.moduleId, authToken);
      compareField(
          result,
          "modules[" + module.moduleId + "].title",
          module.source.getTitle(),
          persistedModule.get("title"));
      compareField(
          result,
          "modules[" + module.moduleId + "].description",
          module.source.getDescription(),
          persistedModule.get("description"));
    }

    for (PersistedAssignment assignment : context.assignments) {
      Map<String, Object> persistedAssignment = fetchAssignment(assignment.assignmentId, authToken);
      compareField(
          result,
          "assignments[" + assignment.assignmentId + "].title",
          assignment.source.getTitle(),
          persistedAssignment.get("title"));
      compareField(
          result,
          "assignments[" + assignment.assignmentId + "].description",
          assignment.source.getDescription(),
          persistedAssignment.get("description"));
      compareField(
          result,
          "assignments[" + assignment.assignmentId + "].instructions",
          assignment.source.getInstructions(),
          persistedAssignment.get("instructions"));
      compareField(
          result,
          "assignments[" + assignment.assignmentId + "].assignmentType",
          assignment.source.getAssignmentType(),
          persistedAssignment.get("assignmentType"));
    }

    for (PersistedQuiz quiz : context.quizzes) {
      Map<String, Object> persistedQuiz = fetchQuiz(quiz.quizId, authToken);
      compareField(
          result,
          "quizzes[" + quiz.quizId + "].title",
          quiz.source.getTitle(),
          persistedQuiz.get("title"));
      compareField(
          result,
          "quizzes[" + quiz.quizId + "].description",
          quiz.source.getDescription(),
          persistedQuiz.get("description"));
      compareField(
          result,
          "quizzes[" + quiz.quizId + "].timeLimit",
          quiz.source.getTimeLimit(),
          persistedQuiz.get("timeLimit"));
      compareField(
          result,
          "quizzes[" + quiz.quizId + "].attemptsAllowed",
          quiz.source.getAttemptsAllowed(),
          persistedQuiz.get("attemptsAllowed"));
      compareField(
          result,
          "quizzes[" + quiz.quizId + "].shuffleQuestions",
          quiz.source.getShuffleQuestions(),
          persistedQuiz.get("shuffleQuestions"));
      compareField(
          result,
          "quizzes[" + quiz.quizId + "].moduleId",
          quiz.moduleId,
          persistedQuiz.get("moduleId"));

      for (PersistedQuestion question : quiz.questions) {
        Map<String, Object> persistedQuestion = fetchQuestion(question.questionId, authToken);
        compareField(
            result,
            "questions[" + question.questionId + "].stem",
            question.source.getStem(),
            persistedQuestion.get("stem"));
        compareField(
            result,
            "questions[" + question.questionId + "].questionType",
            question.source.getQuestionType(),
            persistedQuestion.get("questionType"));
      }
    }

    if (result.mismatches.isEmpty()) {
      log.info("AI persistence verification passed for course {}", context.courseId);
    } else {
      log.warn(
          "AI persistence verification found {} mismatches for course {}",
          result.mismatches.size(),
          context.courseId);
    }
    return result;
  }

  private Map<String, Object> fetchCourse(UUID courseId, String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();
    return webClient
        .get()
        .uri("/courses/{courseId}", courseId)
        .header("Authorization", authToken)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private Map<String, Object> fetchModule(UUID courseId, UUID moduleId, String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();
    return webClient
        .get()
        .uri("/courses/{courseId}/modules/{moduleId}", courseId, moduleId)
        .header("Authorization", authToken)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private Map<String, Object> fetchAssignment(UUID assignmentId, String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();
    return webClient
        .get()
        .uri("/assignments/{assignmentId}", assignmentId)
        .header("Authorization", authToken)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private Map<String, Object> fetchQuiz(UUID quizId, String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();
    return webClient
        .get()
        .uri("/quizzes/{quizId}", quizId)
        .header("Authorization", authToken)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private Map<String, Object> fetchQuestion(UUID questionId, String authToken) {
    WebClient webClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();
    return webClient
        .get()
        .uri("/questions/{questionId}", questionId)
        .header("Authorization", authToken)
        .retrieve()
        .bodyToMono(MAP_RESPONSE_TYPE)
        .block();
  }

  private void rollbackCreatedResources(PersistenceContext context, String authToken) {
    WebClient courseClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();
    WebClient assessmentClient = webClientBuilder.baseUrl(learningServiceUrl + "/api").build();

    for (PersistedQuiz quiz : context.quizzes) {
      if (quiz.assignmentId != null) {
        deleteSafely(assessmentClient, "/assignments/{id}", quiz.assignmentId, authToken);
      }
      for (PersistedQuestion question : quiz.questions) {
        deleteSafely(assessmentClient, "/questions/{id}", question.questionId, authToken);
      }
      deleteSafely(assessmentClient, "/quizzes/{id}", quiz.quizId, authToken);
    }

    for (PersistedAssignment assignment : context.assignments) {
      deleteSafely(assessmentClient, "/assignments/{id}", assignment.assignmentId, authToken);
    }

    for (PersistedModule module : context.modules) {
      deleteSafely(
          courseClient,
          "/courses/{courseId}/modules/{moduleId}",
          context.courseId,
          module.moduleId,
          authToken);
    }

    if (context.courseId != null) {
      deleteSafely(courseClient, "/courses/{id}", context.courseId, authToken);
    }
  }

  private void deleteSafely(
      WebClient client, String uriTemplate, UUID resourceId, String authToken) {
    deleteSafely(client, uriTemplate, resourceId, null, authToken);
  }

  private void deleteSafely(
      WebClient client, String uriTemplate, UUID courseId, UUID resourceId, String authToken) {
    try {
      client
          .delete()
          .uri(
              uriBuilder -> {
                if (resourceId == null) {
                  return uriBuilder.path(uriTemplate).build(courseId);
                }
                return uriBuilder.path(uriTemplate).build(courseId, resourceId);
              })
          .header("Authorization", authToken)
          .retrieve()
          .bodyToMono(Void.class)
          .block();
    } catch (Exception e) {
      log.warn("Rollback deletion failed for {} {}: {}", uriTemplate, resourceId, e.getMessage());
    }
  }

  private void compareField(
      VerificationResult result, String field, Object expected, Object actual) {
    if (expected == null && actual == null) {
      return;
    }
    if (expected == null || actual == null) {
      result.addMismatch(field, "Expected " + expected + " but got " + actual);
      return;
    }
    if (!expected.toString().equals(actual.toString())) {
      result.addMismatch(field, "Expected " + expected + " but got " + actual);
    }
  }

  private static class PersistenceContext {
    private UUID courseId;
    private Map<String, Object> savedCourse;
    private final List<PersistedModule> modules = new ArrayList<>();
    private final List<PersistedAssignment> assignments = new ArrayList<>();
    private final List<PersistedQuiz> quizzes = new ArrayList<>();
  }

  private record PersistedModule(
      UUID moduleId, GeneratedCourseResponse.ModuleData source, Map<String, Object> savedModule) {}

  private record PersistedAssignment(
      UUID assignmentId,
      UUID moduleId,
      GeneratedCourseResponse.AssignmentData source,
      Map<String, Object> savedAssignment) {}

  private static class PersistedQuiz {
    private final UUID quizId;
    private final UUID assignmentId;
    private final UUID moduleId;
    private final GeneratedCourseResponse.QuizData source;
    private final Map<String, Object> savedQuiz;
    private final List<PersistedQuestion> questions = new ArrayList<>();

    private PersistedQuiz(
        UUID quizId,
        UUID assignmentId,
        UUID moduleId,
        GeneratedCourseResponse.QuizData source,
        Map<String, Object> savedQuiz) {
      this.quizId = quizId;
      this.assignmentId = assignmentId;
      this.moduleId = moduleId;
      this.source = source;
      this.savedQuiz = savedQuiz;
    }
  }

  private record PersistedQuestion(
      UUID questionId,
      GeneratedCourseResponse.QuestionData source,
      Map<String, Object> savedQuestion) {}

  private static class VerificationResult {
    private final List<String> mismatches = new ArrayList<>();
    private boolean matches = true;

    private void addMismatch(String field, String message) {
      matches = false;
      mismatches.add(field + ": " + message);
    }

    private Map<String, Object> toMap() {
      return Map.of(
          "matches", matches,
          "mismatches", mismatches);
    }
  }
}
