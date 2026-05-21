package com.university.lms.course.quizzes.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizAttempt;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.QuizAttemptRepository;
import com.university.lms.course.assessment.repository.QuizRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.gradebook.service.CanonicalGradebookService;
import com.university.lms.course.quizzes.dto.QuizAttemptReviewDto;
import com.university.lms.course.quizzes.dto.QuizAttemptStartDto;
import com.university.lms.course.quizzes.dto.QuizAttemptSubmitRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CanonicalQuizAttemptService {
  private final AssignmentRepository assignmentRepository;
  private final QuizRepository quizRepository;
  private final QuizAttemptRepository quizAttemptRepository;
  private final CanonicalGradebookService gradebookService;
  private final CourseAccessService accessService;

  @Transactional
  public QuizAttemptStartDto start(UUID assignmentId, UUID userId) {
    Assignment assignment = requireQuizAssignment(assignmentId);
    accessService.requireStudent(assignment.getCourseId(), userId);
    if (!assignment.isAvailable()) {
      throw ApiException.conflict("ASSIGNMENT_NOT_AVAILABLE", "Quiz assignment is not available");
    }
    if (!assignment.acceptsLateSubmission()) {
      throw ApiException.conflict("DEADLINE_CLOSED", "The quiz deadline has passed");
    }
    Quiz quiz = quizRepository.findById(assignment.getQuizId())
        .orElseThrow(() -> ApiException.notFound("Quiz"));
    quizAttemptRepository.findInProgressAttempt(quiz.getId(), userId)
        .ifPresent(attempt -> {
          throw ApiException.conflict("QUIZ_ATTEMPT_IN_PROGRESS", "Finish the active quiz attempt first");
        });
    long attemptsUsed = quizAttemptRepository.countByQuizIdAndUserId(quiz.getId(), userId);
    if (quiz.getAttemptsAllowed() != null && attemptsUsed >= quiz.getAttemptsAllowed()) {
      throw ApiException.conflict("QUIZ_ATTEMPT_LIMIT_REACHED", "No quiz attempts remain");
    }
    QuizAttempt attempt = QuizAttempt.builder()
        .quiz(quiz)
        .userId(userId)
        .attemptNumber(Math.toIntExact(attemptsUsed + 1))
        .answers(new HashMap<>())
        .build();
    attempt = quizAttemptRepository.save(attempt);
    return new QuizAttemptStartDto(
        attempt.getId(),
        assignmentId,
        attempt.getAttemptNumber(),
        "in_progress",
        attempt.getStartedAt(),
        Boolean.TRUE.equals(quiz.getTimerEnabled()) ? quiz.getTimeLimit() : null);
  }

  @Transactional
  public QuizAttemptReviewDto submit(UUID attemptId, UUID userId, QuizAttemptSubmitRequest request) {
    QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
        .orElseThrow(() -> ApiException.notFound("Quiz attempt"));
    Assignment assignment = assignmentRepository.findFirstByQuizId(attempt.getQuiz().getId())
        .orElseThrow(() -> ApiException.notFound("Quiz assignment"));
    if (!attempt.getUserId().equals(userId)) {
      throw ApiException.forbidden("You cannot submit another student's quiz attempt");
    }
    accessService.requireStudent(assignment.getCourseId(), userId);
    if (attempt.isSubmitted()) {
      throw ApiException.conflict("QUIZ_ATTEMPT_ALREADY_SUBMITTED", "Quiz attempt is already submitted");
    }
    enforceTimeLimit(attempt);
    attempt.setAnswers(new HashMap<>(request.answers()));
    attempt.setSubmittedAt(LocalDateTime.now());
    BigDecimal autoScore = scoreAttempt(attempt);
    attempt.setAutoScore(autoScore);
    BigDecimal manualScore = attempt.getManualScore() == null ? BigDecimal.ZERO : attempt.getManualScore();
    attempt.setFinalScore(autoScore.add(manualScore).setScale(2, RoundingMode.HALF_UP));
    attempt = quizAttemptRepository.save(attempt);
    gradebookService.recordQuizAttempt(assignment, attempt);
    return buildReview(attempt, assignment, userId, false);
  }

  @Transactional(readOnly = true)
  public QuizAttemptReviewDto review(UUID attemptId, UUID userId) {
    QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
        .orElseThrow(() -> ApiException.notFound("Quiz attempt"));
    Assignment assignment = assignmentRepository.findFirstByQuizId(attempt.getQuiz().getId())
        .orElseThrow(() -> ApiException.notFound("Quiz assignment"));
    boolean teacher = accessService.canTeach(assignment.getCourseId(), userId);
    if (!teacher && !attempt.getUserId().equals(userId)) {
      throw ApiException.forbidden("You cannot review another student's quiz attempt");
    }
    accessService.requireCourseAccess(assignment.getCourseId(), userId);
    if (!teacher && !canReviewAttempts(assignment)) {
      throw ApiException.forbidden("Quiz attempt review is not available");
    }
    return buildReview(attempt, assignment, userId, true);
  }

  private QuizAttemptReviewDto buildReview(
      QuizAttempt attempt,
      Assignment assignment,
      UUID userId,
      boolean reviewEndpoint) {
    boolean teacher = accessService.canTeach(assignment.getCourseId(), userId);
    Map<String, Object> settings = canonicalSettingsOf(assignment);
    boolean canExposeScore = teacher
        || (attempt.isSubmitted() && booleanSetting(settings, "showScoreAfterSubmit", true));
    boolean showAnswers = teacher
        || (attempt.isSubmitted()
            && booleanSetting(settings, "showCorrectAnswers", false)
            && attempt.getQuiz().canShowCorrectAnswers()
            && (!reviewEndpoint || canReviewAttempts(assignment)));
    return new QuizAttemptReviewDto(
        attempt.getId(),
        assignment.getId(),
        attempt.getAttemptNumber(),
        attempt.isSubmitted() ? "submitted" : "in_progress",
        attempt.getStartedAt(),
        attempt.getSubmittedAt(),
        attempt.getAnswers(),
        canExposeScore ? attempt.getAutoScore() : null,
        canExposeScore ? attempt.getFinalScore() : null,
        showAnswers);
  }

  private void enforceTimeLimit(QuizAttempt attempt) {
    Quiz quiz = attempt.getQuiz();
    if (attempt.getStartedAt() == null
        || !Boolean.TRUE.equals(quiz.getTimerEnabled())
        || quiz.getTimeLimit() == null
        || quiz.getTimeLimit() <= 0) {
      return;
    }
    LocalDateTime deadline = attempt.getStartedAt().plus(Duration.ofMinutes(quiz.getTimeLimit()));
    if (LocalDateTime.now().isAfter(deadline)) {
      throw ApiException.conflict("QUIZ_TIME_LIMIT_EXCEEDED", "Quiz time limit has been exceeded");
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> canonicalSettingsOf(Assignment assignment) {
    Map<String, Object> config = assignment.getExternalToolConfig() == null
        ? Map.of()
        : assignment.getExternalToolConfig();
    Object settings = config.get("canonicalSettings");
    return settings instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }

  private boolean canReviewAttempts(Assignment assignment) {
    return booleanSetting(canonicalSettingsOf(assignment), "canReviewAttempts", true);
  }

  private boolean booleanSetting(Map<String, Object> settings, String key, boolean defaultValue) {
    Object value = settings.get(key);
    return value instanceof Boolean bool ? bool : defaultValue;
  }

  private BigDecimal scoreAttempt(QuizAttempt attempt) {
    BigDecimal total = BigDecimal.ZERO;
    Map<String, Object> answers = attempt.getAnswers() == null ? Map.of() : attempt.getAnswers();
    for (var quizQuestion : attempt.getQuiz().getQuizQuestions()) {
      var question = quizQuestion.getQuestion();
      if (question == null || Boolean.TRUE.equals(question.getIsArchived())) {
        continue;
      }
      Object answer = answers.get(question.getId().toString());
      if (answer == null) {
        answer = answers.get(quizQuestion.getId().toString());
      }
      if (answer == null) {
        continue;
      }
      GradeOutcome outcome = gradeQuestion(
          question.getQuestionType(),
          question.getCorrectAnswer() == null ? Map.of() : question.getCorrectAnswer(),
          answer,
          quizQuestion.getEffectivePoints() == null ? BigDecimal.ZERO : quizQuestion.getEffectivePoints());
      if (outcome.scoreAwarded() != null) {
        total = total.add(outcome.scoreAwarded());
      }
    }
    return total.setScale(2, RoundingMode.HALF_UP);
  }

  private GradeOutcome gradeQuestion(
      String rawQuestionType,
      Map<String, Object> answerKey,
      Object userAnswer,
      BigDecimal points) {
    String questionType = rawQuestionType == null
        ? ""
        : rawQuestionType.trim().toUpperCase(Locale.ROOT);
    return switch (questionType) {
      case "MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE" -> {
        boolean correct = Objects.equals(readSingleAnswer(answerKey), normalizeScalar(userAnswer));
        yield new GradeOutcome(correct, correct ? points : BigDecimal.ZERO);
      }
      case "MULTIPLE_RESPONSE", "MULTI_SELECT", "MULTIPLE_SELECT" -> {
        Set<String> expected = readStringSet(answerKey.get("choices"));
        if (expected.isEmpty()) {
          expected = readStringSet(answerKey.get("answers"));
        }
        if (expected.isEmpty()) {
          expected = readStringSet(answerKey.get("answer"));
        }
        Set<String> actual = readStringSet(userAnswer);
        boolean correct = !expected.isEmpty() && expected.equals(actual);
        yield new GradeOutcome(correct, correct ? points : BigDecimal.ZERO);
      }
      default -> new GradeOutcome(null, null);
    };
  }

  private String readSingleAnswer(Map<String, Object> answerKey) {
    if (answerKey == null || answerKey.isEmpty()) {
      return null;
    }
    if (answerKey.containsKey("choice")) {
      return normalizeScalar(answerKey.get("choice"));
    }
    if (answerKey.containsKey("value")) {
      return normalizeScalar(answerKey.get("value"));
    }
    if (answerKey.containsKey("answer")) {
      return normalizeScalar(answerKey.get("answer"));
    }
    if (answerKey.size() == 1) {
      return normalizeScalar(answerKey.values().iterator().next());
    }
    return null;
  }

  private Set<String> readStringSet(Object value) {
    return new LinkedHashSet<>(toStringList(value));
  }

  private List<String> toStringList(Object value) {
    if (value == null) {
      return List.of();
    }
    if (value instanceof List<?> list) {
      return list.stream().map(this::normalizeScalar).filter(Objects::nonNull).toList();
    }
    if (value instanceof Map<?, ?> map && map.get("values") instanceof List<?> list) {
      return list.stream().map(this::normalizeScalar).filter(Objects::nonNull).toList();
    }
    String scalar = normalizeScalar(value);
    return scalar == null ? List.of() : List.of(scalar);
  }

  private String normalizeScalar(Object value) {
    return value == null ? null : value.toString().trim().toLowerCase(Locale.ROOT);
  }

  private Assignment requireQuizAssignment(UUID assignmentId) {
    Assignment assignment = assignmentRepository.findById(assignmentId)
        .orElseThrow(() -> ApiException.notFound("Assignment"));
    if (assignment.getQuizId() == null || !"QUIZ".equalsIgnoreCase(assignment.getAssignmentType())) {
      throw ApiException.badRequest("NOT_A_QUIZ_ASSIGNMENT", "Assignment is not a quiz assignment");
    }
    return assignment;
  }

  private record GradeOutcome(Boolean correct, BigDecimal scoreAwarded) {}
}
