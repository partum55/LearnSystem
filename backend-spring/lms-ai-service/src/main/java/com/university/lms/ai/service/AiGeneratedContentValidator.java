package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.GeneratedAssignmentResponse;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.dto.GeneratedModuleResponse;
import com.university.lms.ai.dto.GeneratedQuizResponse;
import com.university.lms.ai.exception.AiContentValidationException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiGeneratedContentValidator {

  private static final int MAX_LOG_LENGTH = 2000;
  private static final Set<String> VALID_ASSIGNMENT_TYPES =
      Set.of("FILE_UPLOAD", "TEXT", "CODE", "QUIZ", "URL", "MANUAL_GRADE", "EXTERNAL");
  private static final Set<String> VALID_QUESTION_TYPES =
      Set.of(
          "MULTIPLE_CHOICE",
          "TRUE_FALSE",
          "SHORT_ANSWER",
          "ESSAY",
          "MATCHING",
          "FILL_BLANK",
          "NUMERICAL",
          "FORMULA");
  private static final Set<String> VALID_ACTIVITY_TYPES =
      Set.of("lecture", "discussion", "lab", "project", "workshop", "quiz");
  private static final Set<String> VALID_RESOURCE_TYPES =
      Set.of("book", "article", "video", "website", "tool");
  private static final Set<String> VALID_COURSE_RESOURCE_TYPES =
      Set.of("TEXT", "VIDEO", "PDF", "SLIDE", "LINK", "CODE", "OTHER");

  private final Validator validator;
  private final ObjectMapper objectMapper;

  public GeneratedQuizResponse validateQuiz(GeneratedQuizResponse payload) {
    GeneratedQuizResponse sanitized = sanitizeQuiz(payload);
    validateBean(sanitized, "quiz");
    validateQuizRules(sanitized);
    logValidated("quiz", sanitized);
    return sanitized;
  }

  public GeneratedAssignmentResponse validateAssignment(GeneratedAssignmentResponse payload) {
    GeneratedAssignmentResponse sanitized = sanitizeAssignment(payload);
    validateBean(sanitized, "assignment");
    validateAssignmentRules(sanitized);
    logValidated("assignment", sanitized);
    return sanitized;
  }

  public GeneratedModuleResponse validateModule(GeneratedModuleResponse payload) {
    GeneratedModuleResponse sanitized = sanitizeModule(payload);
    validateBean(sanitized, "module");
    validateModuleRules(sanitized);
    logValidated("module", sanitized);
    return sanitized;
  }

  public GeneratedCourseResponse validateCourse(GeneratedCourseResponse payload) {
    GeneratedCourseResponse sanitized = sanitizeCourse(payload);
    validateBean(sanitized, "course");
    validateCourseRules(sanitized);
    logValidated("course", sanitized);
    return sanitized;
  }

  private void validateBean(Object payload, String contentType) {
    if (payload == null) {
      logValidationFailure(contentType, null, List.of("Payload must not be null"));
      throw new AiContentValidationException(contentType, List.of("Payload must not be null"));
    }
    Set<ConstraintViolation<Object>> violations = validator.validate(payload);
    if (!violations.isEmpty()) {
      List<String> errors =
          violations.stream()
              .map(violation -> violation.getPropertyPath() + " " + violation.getMessage())
              .collect(Collectors.toList());
      logValidationFailure(contentType, payload, errors);
      throw new AiContentValidationException(contentType, errors);
    }
  }

  private void validateQuizRules(GeneratedQuizResponse payload) {
    List<String> errors = new ArrayList<>();

    for (int i = 0; i < payload.getQuestions().size(); i++) {
      GeneratedQuizResponse.GeneratedQuestion question = payload.getQuestions().get(i);
      String questionType = normalizeEnum(question.getQuestionType());
      if (!VALID_QUESTION_TYPES.contains(questionType)) {
        errors.add("questions[" + i + "].questionType must be one of " + VALID_QUESTION_TYPES);
      }

      if ("MULTIPLE_CHOICE".equals(questionType) || "TRUE_FALSE".equals(questionType)) {
        if (question.getAnswerOptions() == null || question.getAnswerOptions().size() < 2) {
          errors.add("questions[" + i + "].answerOptions must include at least 2 options");
        } else if (question.getAnswerOptions().stream()
            .noneMatch(GeneratedQuizResponse.AnswerOption::getIsCorrect)) {
          errors.add("questions[" + i + "].answerOptions must include at least one correct option");
        }
      } else if (question.getAnswerOptions() != null && !question.getAnswerOptions().isEmpty()) {
        errors.add(
            "questions[" + i + "].answerOptions must be empty for non-multiple choice questions");
      }

      if (!"MULTIPLE_CHOICE".equals(questionType) && !"TRUE_FALSE".equals(questionType)) {
        if (question.getCorrectAnswer() == null || question.getCorrectAnswer().isBlank()) {
          errors.add(
              "questions[" + i + "].correctAnswer is required for non-multiple choice questions");
        }
      }
    }

    if (!errors.isEmpty()) {
      logValidationFailure("quiz", payload, errors);
      throw new AiContentValidationException("quiz", errors);
    }
  }

  private void validateAssignmentRules(GeneratedAssignmentResponse payload) {
    List<String> errors = new ArrayList<>();
    String assignmentType = normalizeEnum(payload.getAssignmentType());
    if (!VALID_ASSIGNMENT_TYPES.contains(assignmentType)) {
      errors.add("assignmentType must be one of " + VALID_ASSIGNMENT_TYPES);
    }

    if (!errors.isEmpty()) {
      logValidationFailure("assignment", payload, errors);
      throw new AiContentValidationException("assignment", errors);
    }
  }

  private void validateModuleRules(GeneratedModuleResponse payload) {
    List<String> errors = new ArrayList<>();
    if (payload.getWeeks() != null) {
      for (int i = 0; i < payload.getWeeks().size(); i++) {
        GeneratedModuleResponse.Week week = payload.getWeeks().get(i);
        if (week.getActivities() != null) {
          for (int j = 0; j < week.getActivities().size(); j++) {
            GeneratedModuleResponse.Activity activity = week.getActivities().get(j);
            String type = normalizeLower(activity.getType());
            if (!VALID_ACTIVITY_TYPES.contains(type)) {
              errors.add(
                  "weeks["
                      + i
                      + "].activities["
                      + j
                      + "].type must be one of "
                      + VALID_ACTIVITY_TYPES);
            }
          }
        }
      }
    }
    if (payload.getRecommendedResources() != null) {
      for (int i = 0; i < payload.getRecommendedResources().size(); i++) {
        GeneratedModuleResponse.Resource resource = payload.getRecommendedResources().get(i);
        String type = normalizeLower(resource.getType());
        if (!VALID_RESOURCE_TYPES.contains(type)) {
          errors.add("recommendedResources[" + i + "].type must be one of " + VALID_RESOURCE_TYPES);
        }
      }
    }

    if (!errors.isEmpty()) {
      logValidationFailure("module", payload, errors);
      throw new AiContentValidationException("module", errors);
    }
  }

  private void validateCourseRules(GeneratedCourseResponse payload) {
    List<String> errors = new ArrayList<>();
    if (payload.getCourse() == null) {
      errors.add("course must not be null");
    }

    if (payload.getModules() != null) {
      for (int i = 0; i < payload.getModules().size(); i++) {
        GeneratedCourseResponse.ModuleData module = payload.getModules().get(i);
        if (module.getAssignments() == null) {
          errors.add("modules[" + i + "].assignments must not be null");
        }
        if (module.getResources() != null) {
          for (int j = 0; j < module.getResources().size(); j++) {
            GeneratedCourseResponse.ResourceData resource = module.getResources().get(j);
            String resourceType = normalizeEnum(resource.getResourceType());
            if (!VALID_COURSE_RESOURCE_TYPES.contains(resourceType)) {
              errors.add(
                  "modules["
                      + i
                      + "].resources["
                      + j
                      + "].resourceType must be one of "
                      + VALID_COURSE_RESOURCE_TYPES);
            }
          }
        }
        if (module.getAssignments() != null) {
          for (int j = 0; j < module.getAssignments().size(); j++) {
            GeneratedCourseResponse.AssignmentData assignment = module.getAssignments().get(j);
            String assignmentType = normalizeEnum(assignment.getAssignmentType());
            if (!VALID_ASSIGNMENT_TYPES.contains(assignmentType)) {
              errors.add(
                  "modules["
                      + i
                      + "].assignments["
                      + j
                      + "].assignmentType must be one of "
                      + VALID_ASSIGNMENT_TYPES);
            }
          }
        }
      }
    }

    if (payload.getQuestionBank() != null) {
      for (int i = 0; i < payload.getQuestionBank().size(); i++) {
        GeneratedCourseResponse.QuestionData question = payload.getQuestionBank().get(i);
        String questionType = normalizeEnum(question.getQuestionType());
        if (!VALID_QUESTION_TYPES.contains(questionType)) {
          errors.add(
              "questionBank[" + i + "].questionType must be one of " + VALID_QUESTION_TYPES);
        }
      }
    }

    if (!errors.isEmpty()) {
      logValidationFailure("course", payload, errors);
      throw new AiContentValidationException("course", errors);
    }
  }

  private GeneratedQuizResponse sanitizeQuiz(GeneratedQuizResponse payload) {
    if (payload == null) {
      return null;
    }
    payload.setTitle(sanitizeText(payload.getTitle()));
    payload.setDescription(sanitizeText(payload.getDescription()));
    payload.setTimeLimit(payload.getTimeLimit() == null ? 30 : payload.getTimeLimit());
    payload.setAttemptsAllowed(
        payload.getAttemptsAllowed() == null ? 1 : payload.getAttemptsAllowed());
    payload.setQuestions(sanitizeList(payload.getQuestions()));
    if (payload.getQuestions() != null) {
      for (GeneratedQuizResponse.GeneratedQuestion question : payload.getQuestions()) {
        if (question == null) {
          continue;
        }
        question.setQuestionText(sanitizeText(question.getQuestionText()));
        question.setQuestionType(normalizeEnum(question.getQuestionType()));
        question.setCorrectAnswer(sanitizeText(question.getCorrectAnswer()));
        question.setExplanation(sanitizeText(question.getExplanation()));
        question.setAnswerOptions(sanitizeList(question.getAnswerOptions()));
        if (question.getAnswerOptions() != null) {
          for (GeneratedQuizResponse.AnswerOption option : question.getAnswerOptions()) {
            if (option == null) {
              continue;
            }
            option.setText(sanitizeText(option.getText()));
            option.setFeedback(sanitizeText(option.getFeedback()));
          }
        }
      }
    }
    return payload;
  }

  private GeneratedAssignmentResponse sanitizeAssignment(GeneratedAssignmentResponse payload) {
    if (payload == null) {
      return null;
    }
    payload.setTitle(sanitizeText(payload.getTitle()));
    payload.setDescription(sanitizeText(payload.getDescription()));
    payload.setInstructions(sanitizeText(payload.getInstructions()));
    payload.setAssignmentType(normalizeEnum(payload.getAssignmentType()));
    payload.setMaxPoints(payload.getMaxPoints() == null ? 100 : payload.getMaxPoints());
    payload.setLearningObjectives(sanitizeStringList(payload.getLearningObjectives()));
    payload.setResources(sanitizeStringList(payload.getResources()));
    return payload;
  }

  private GeneratedModuleResponse sanitizeModule(GeneratedModuleResponse payload) {
    if (payload == null) {
      return null;
    }
    payload.setTitle(sanitizeText(payload.getTitle()));
    payload.setDescription(sanitizeText(payload.getDescription()));
    payload.setLearningObjectives(sanitizeStringList(payload.getLearningObjectives()));
    payload.setAssessmentStrategies(sanitizeStringList(payload.getAssessmentStrategies()));
    payload.setWeeks(sanitizeList(payload.getWeeks()));
    payload.setRecommendedResources(sanitizeList(payload.getRecommendedResources()));
    if (payload.getWeeks() != null) {
      for (GeneratedModuleResponse.Week week : payload.getWeeks()) {
        if (week == null) {
          continue;
        }
        week.setTitle(sanitizeText(week.getTitle()));
        week.setDescription(sanitizeText(week.getDescription()));
        week.setTopics(sanitizeStringList(week.getTopics()));
        week.setReadings(sanitizeStringList(week.getReadings()));
        week.setActivities(sanitizeList(week.getActivities()));
        if (week.getActivities() != null) {
          for (GeneratedModuleResponse.Activity activity : week.getActivities()) {
            if (activity == null) {
              continue;
            }
            activity.setType(normalizeLower(activity.getType()));
            activity.setTitle(sanitizeText(activity.getTitle()));
            activity.setDescription(sanitizeText(activity.getDescription()));
          }
        }
      }
    }
    if (payload.getRecommendedResources() != null) {
      for (GeneratedModuleResponse.Resource resource : payload.getRecommendedResources()) {
        if (resource == null) {
          continue;
        }
        resource.setType(normalizeLower(resource.getType()));
        resource.setTitle(sanitizeText(resource.getTitle()));
        resource.setDescription(sanitizeText(resource.getDescription()));
        resource.setUrl(sanitizeText(resource.getUrl()));
      }
    }
    return payload;
  }

  private GeneratedCourseResponse sanitizeCourse(GeneratedCourseResponse payload) {
    if (payload == null) {
      return null;
    }
    if (payload.getVersion() == null) {
      payload.setVersion("1.0");
    }
    if (payload.getCourse() != null) {
      payload.getCourse().setCode(sanitizeText(payload.getCourse().getCode()));
      payload.getCourse().setTitleUk(sanitizeText(payload.getCourse().getTitleUk()));
      payload.getCourse().setTitleEn(sanitizeText(payload.getCourse().getTitleEn()));
      payload.getCourse().setDescriptionUk(sanitizeText(payload.getCourse().getDescriptionUk()));
      payload.getCourse().setDescriptionEn(sanitizeText(payload.getCourse().getDescriptionEn()));
      payload.getCourse().setSyllabus(sanitizeText(payload.getCourse().getSyllabus()));
      payload.getCourse().setVisibility(sanitizeText(payload.getCourse().getVisibility()));
    }
    payload.setModules(sanitizeList(payload.getModules()));
    if (payload.getModules() != null) {
      for (GeneratedCourseResponse.ModuleData module : payload.getModules()) {
        if (module == null) {
          continue;
        }
        module.setTitle(sanitizeText(module.getTitle()));
        module.setDescription(sanitizeText(module.getDescription()));
        module.setAssignments(sanitizeList(module.getAssignments()));
        module.setResources(sanitizeList(module.getResources()));
        if (module.getResources() != null) {
          for (GeneratedCourseResponse.ResourceData resource : module.getResources()) {
            if (resource == null) {
              continue;
            }
            resource.setTitle(sanitizeText(resource.getTitle()));
            resource.setDescription(sanitizeText(resource.getDescription()));
            resource.setResourceType(normalizeEnum(resource.getResourceType()));
            resource.setExternalUrl(sanitizeText(resource.getExternalUrl()));
            resource.setTextContent(sanitizeText(resource.getTextContent()));
          }
        }
        if (module.getAssignments() != null) {
          for (GeneratedCourseResponse.AssignmentData assignment : module.getAssignments()) {
            if (assignment == null) {
              continue;
            }
            assignment.setTitle(sanitizeText(assignment.getTitle()));
            assignment.setDescription(sanitizeText(assignment.getDescription()));
            assignment.setAssignmentType(normalizeEnum(assignment.getAssignmentType()));
            assignment.setInstructions(sanitizeText(assignment.getInstructions()));
            assignment.setProgrammingLanguage(sanitizeText(assignment.getProgrammingLanguage()));
            assignment.setStarterCode(sanitizeText(assignment.getStarterCode()));
            assignment.setEstimatedDuration(sanitizeText(assignment.getEstimatedDuration()));
            assignment.setTags(sanitizeStringList(assignment.getTags()));
            assignment.setSubmissionTypes(sanitizeStringList(assignment.getSubmissionTypes()));
            assignment.setAllowedFileTypes(sanitizeStringList(assignment.getAllowedFileTypes()));
          }
        }
      }
    }
    payload.setQuizzes(sanitizeList(payload.getQuizzes()));
    if (payload.getQuizzes() != null) {
      for (GeneratedCourseResponse.QuizData quiz : payload.getQuizzes()) {
        if (quiz == null) {
          continue;
        }
        quiz.setTitle(sanitizeText(quiz.getTitle()));
        quiz.setDescription(sanitizeText(quiz.getDescription()));
        quiz.setModuleTitle(sanitizeText(quiz.getModuleTitle()));
        quiz.setQuestionRefs(sanitizeStringList(quiz.getQuestionRefs()));
      }
    }
    payload.setQuestionBank(sanitizeList(payload.getQuestionBank()));
    if (payload.getQuestionBank() != null) {
      for (GeneratedCourseResponse.QuestionData question : payload.getQuestionBank()) {
        if (question == null) {
          continue;
        }
        question.setId(sanitizeText(question.getId()));
        question.setStem(sanitizeText(question.getStem()));
        question.setQuestionType(normalizeEnum(question.getQuestionType()));
        question.setExplanation(sanitizeText(question.getExplanation()));
      }
    }
    return payload;
  }

  private String sanitizeText(String value) {
    if (value == null) {
      return null;
    }
    String normalized = Normalizer.normalize(value, Normalizer.Form.NFC).trim();
    return normalized.replaceAll("[\\p{Cc}&&[^\\n\\r\\t]]", "");
  }

  private String normalizeEnum(String value) {
    if (value == null) {
      return null;
    }
    return sanitizeText(value).toUpperCase(Locale.ROOT);
  }

  private String normalizeLower(String value) {
    if (value == null) {
      return null;
    }
    return sanitizeText(value).toLowerCase(Locale.ROOT);
  }

  private <T> List<T> sanitizeList(List<T> list) {
    if (list == null) {
      return new ArrayList<>();
    }
    return list.stream().filter(Objects::nonNull).collect(Collectors.toCollection(ArrayList::new));
  }

  private List<String> sanitizeStringList(List<String> list) {
    if (list == null) {
      return null;
    }
    return list.stream()
        .filter(Objects::nonNull)
        .map(this::sanitizeText)
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.toCollection(ArrayList::new));
  }

  private void logValidated(String contentType, Object payload) {
    try {
      String json = objectMapper.writeValueAsString(payload);
      log.info("Validated AI {} payload ({} chars)", contentType, json.length());
      log.debug("AI {} payload: {}", contentType, truncate(json));
    } catch (Exception e) {
      log.debug("Unable to serialize AI {} payload for logging", contentType, e);
    }
  }

  private void logValidationFailure(String contentType, Object payload, List<String> errors) {
    try {
      String json = objectMapper.writeValueAsString(payload);
      log.warn(
          "AI {} payload failed validation: {} | payload={}", contentType, errors, truncate(json));
    } catch (Exception e) {
      log.warn("AI {} payload failed validation: {}", contentType, errors, e);
    }
  }

  private String truncate(String value) {
    if (value == null || value.length() <= MAX_LOG_LENGTH) {
      return value;
    }
    return value.substring(0, MAX_LOG_LENGTH) + "...(truncated)";
  }
}
