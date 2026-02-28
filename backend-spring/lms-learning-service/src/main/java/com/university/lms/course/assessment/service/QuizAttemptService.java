package com.university.lms.course.assessment.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.*;
import com.university.lms.course.assessment.dto.QuizAttemptDto;
import com.university.lms.course.assessment.dto.QuizAttemptQuestionDto;
import com.university.lms.course.assessment.dto.QuizAttemptResultDto;
import com.university.lms.course.assessment.dto.QuizAttemptResultQuestionDto;
import com.university.lms.course.assessment.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for quiz attempts with frozen question-version snapshots and per-question responses. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizAttemptService {

  private final QuizAttemptRepository quizAttemptRepository;
  private final QuizRepository quizRepository;
  private final QuizSectionRepository quizSectionRepository;
  private final QuestionBankRepository questionBankRepository;
  private final QuestionVersionService questionVersionService;
  private final QuizAttemptQuestionRepository quizAttemptQuestionRepository;
  private final QuizResponseEntryRepository quizResponseEntryRepository;
  private final AssessmentMapper assessmentMapper;

  @Transactional
  public QuizAttempt startQuizAttempt(
      UUID quizId, UUID userId, String ipAddress, String browserFingerprint) {
    log.info("Starting quiz attempt for user {} on quiz {}", userId, quizId);

    Quiz quiz = findQuizById(quizId);

    quizAttemptRepository
        .findInProgressAttempt(quizId, userId)
        .ifPresent(
            attempt -> {
              throw new ValidationException("You already have an in-progress attempt for this quiz");
            });

    long attemptCount = quizAttemptRepository.countByQuizIdAndUserId(quizId, userId);
    if (attemptCount >= quiz.getAttemptsAllowed()) {
      throw new ValidationException("You have reached the maximum number of attempts for this quiz");
    }

    int attemptNumber = (int) attemptCount + 1;

    QuizAttempt attempt =
        QuizAttempt.builder()
            .quiz(quiz)
            .userId(userId)
            .attemptNumber(attemptNumber)
            .ipAddress(ipAddress)
            .browserFingerprint(browserFingerprint)
            .build();

    QuizAttempt savedAttempt = quizAttemptRepository.save(attempt);
    initializeAttemptQuestions(savedAttempt);

    log.info("Quiz attempt started successfully with ID: {}", savedAttempt.getId());
    return savedAttempt;
  }

  @Transactional
  public QuizAttempt saveProgress(UUID attemptId, Map<String, Object> answers, UUID userId) {
    QuizAttempt attempt = findAttemptById(attemptId);
    ensureAttemptOwner(attempt, userId);

    if (attempt.isSubmitted()) {
      throw new ValidationException("Cannot save progress for a submitted attempt");
    }

    attempt.setAnswers(answers == null ? Map.of() : answers);
    return quizAttemptRepository.save(attempt);
  }

  @Transactional
  public QuizAttempt submitQuizAttempt(UUID attemptId, Map<String, Object> answers, UUID userId) {
    log.info("Submitting quiz attempt: {}", attemptId);

    QuizAttempt attempt = findAttemptById(attemptId);
    ensureAttemptOwner(attempt, userId);

    if (attempt.isSubmitted()) {
      throw new ValidationException("This attempt has already been submitted");
    }

    Quiz quiz = attempt.getQuiz();
    if (quiz.getTimeLimit() != null) {
      long minutesElapsed =
          java.time.Duration.between(attempt.getStartedAt(), LocalDateTime.now()).toMinutes();
      if (minutesElapsed > quiz.getTimeLimit()) {
        log.warn("Time limit exceeded for attempt: {}", attemptId);
      }
    }

    Map<String, Object> safeAnswers = answers == null ? Map.of() : answers;
    attempt.setAnswers(safeAnswers);
    attempt.setSubmittedAt(LocalDateTime.now());

    BigDecimal autoScore = calculateAndPersistAutoScore(attempt, safeAnswers);
    attempt.setAutoScore(autoScore);
    attempt.setFinalScore(autoScore);

    QuizAttempt submittedAttempt = quizAttemptRepository.save(attempt);
    log.info("Quiz attempt submitted successfully: {}", attemptId);

    return submittedAttempt;
  }

  @Transactional
  public QuizAttempt gradeQuizAttempt(
      UUID attemptId, BigDecimal manualScore, String feedback, UUID gradedBy) {
    log.info("Grading quiz attempt: {} by user: {}", attemptId, gradedBy);

    QuizAttempt attempt = findAttemptById(attemptId);
    if (!attempt.isSubmitted()) {
      throw new ValidationException("Cannot grade an unsubmitted attempt");
    }

    attempt.setManualScore(manualScore);
    attempt.setFeedback(feedback);
    attempt.setGradedBy(gradedBy);
    attempt.setGradedAt(LocalDateTime.now());
    attempt.setFinalScore(manualScore != null ? manualScore : attempt.getAutoScore());

    return quizAttemptRepository.save(attempt);
  }

  public QuizAttemptDto getAttemptById(UUID attemptId, UUID userId, String userRole) {
    QuizAttempt attempt = findAttemptById(attemptId);
    ensureAttemptAccessible(attempt, userId, userRole);
    return assessmentMapper.toDto(attempt);
  }

  public List<QuizAttemptQuestionDto> getAttemptQuestions(UUID attemptId, UUID userId, String userRole) {
    QuizAttempt attempt = findAttemptById(attemptId);
    ensureAttemptAccessible(attempt, userId, userRole);

    return quizAttemptQuestionRepository.findByAttempt_IdOrderByPositionAsc(attemptId).stream()
        .map(this::toDto)
        .toList();
  }

  public QuizAttemptResultDto getAttemptResults(UUID attemptId, UUID userId, String userRole) {
    QuizAttempt attempt = findAttemptById(attemptId);
    ensureAttemptAccessible(attempt, userId, userRole);

    List<QuizAttemptQuestion> attemptQuestions =
        quizAttemptQuestionRepository.findByAttempt_IdOrderByPositionAsc(attemptId);
    Map<UUID, QuizResponseEntry> responsesByAttemptQuestionId =
        quizResponseEntryRepository.findByAttempt_Id(attemptId).stream()
            .filter(response -> response.getAttemptQuestion() != null)
            .collect(
                java.util.stream.Collectors.toMap(
                    response -> response.getAttemptQuestion().getId(),
                    Function.identity(),
                    (left, right) -> right,
                    LinkedHashMap::new));

    BigDecimal totalPoints = BigDecimal.ZERO;
    BigDecimal earnedPoints = BigDecimal.ZERO;
    List<QuizAttemptResultQuestionDto> resultQuestions = new ArrayList<>();

    for (QuizAttemptQuestion attemptQuestion : attemptQuestions) {
      BigDecimal points = attemptQuestion.getPoints() == null ? BigDecimal.ZERO : attemptQuestion.getPoints();
      totalPoints = totalPoints.add(points);

      QuizResponseEntry responseEntry = responsesByAttemptQuestionId.get(attemptQuestion.getId());
      BigDecimal scoreAwarded =
          responseEntry == null || responseEntry.getScoreAwarded() == null
              ? BigDecimal.ZERO
              : responseEntry.getScoreAwarded();
      earnedPoints = earnedPoints.add(scoreAwarded);

      resultQuestions.add(
          QuizAttemptResultQuestionDto.builder()
              .attemptQuestionId(attemptQuestion.getId())
              .questionId(attemptQuestion.getQuestion().getId())
              .questionVersionId(
                  attemptQuestion.getQuestionVersion() == null
                      ? null
                      : attemptQuestion.getQuestionVersion().getId())
              .position(attemptQuestion.getPosition())
              .points(points)
              .promptSnapshot(attemptQuestion.getPromptSnapshot())
              .payloadSnapshot(attemptQuestion.getPayloadSnapshot())
              .response(responseEntry == null ? Map.of() : responseEntry.getResponseJson())
              .correct(responseEntry == null ? null : responseEntry.getIsCorrect())
              .scoreAwarded(responseEntry == null ? null : responseEntry.getScoreAwarded())
              .feedback(responseEntry == null ? null : responseEntry.getFeedback())
              .gradedAt(responseEntry == null ? null : responseEntry.getGradedAt())
              .build());
    }

    return QuizAttemptResultDto.builder()
        .attempt(assessmentMapper.toDto(attempt))
        .totalPoints(totalPoints.setScale(2, RoundingMode.HALF_UP))
        .earnedPoints(earnedPoints.setScale(2, RoundingMode.HALF_UP))
        .questions(resultQuestions)
        .build();
  }

  public List<QuizAttempt> getUserAttempts(UUID quizId, UUID userId) {
    return quizAttemptRepository.findByQuizIdAndUserIdOrderByAttemptNumberAsc(quizId, userId);
  }

  public QuizAttempt getLatestAttempt(UUID quizId, UUID userId) {
    return quizAttemptRepository
        .findFirstByQuizIdAndUserIdOrderByAttemptNumberDesc(quizId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("No attempts found for this quiz"));
  }

  public QuizAttempt getInProgressAttempt(UUID quizId, UUID userId) {
    return quizAttemptRepository.findInProgressAttempt(quizId, userId).orElse(null);
  }

  public List<QuizAttempt> getUngradedAttempts(UUID quizId) {
    return quizAttemptRepository.findUngradedAttempts(quizId);
  }

  @Transactional
  protected void initializeAttemptQuestions(QuizAttempt attempt) {
    Quiz quiz = attempt.getQuiz();
    List<QuestionSelection> selected = selectQuestionsForAttempt(quiz);

    if (Boolean.TRUE.equals(quiz.getShuffleQuestions())) {
      Collections.shuffle(selected);
    }

    quizAttemptQuestionRepository.deleteByAttempt_Id(attempt.getId());
    int position = 0;
    for (QuestionSelection selection : selected) {
      Map<String, Object> payloadSnapshot = new HashMap<>(selection.version().getPayloadJson());
      payloadSnapshot.putIfAbsent("questionType", selection.question().getQuestionType());

      if (Boolean.TRUE.equals(quiz.getShuffleAnswers())) {
        payloadSnapshot = shuffleOptions(payloadSnapshot);
      }

      QuizAttemptQuestion attemptQuestion =
          QuizAttemptQuestion.builder()
              .attempt(attempt)
              .question(selection.question())
              .questionVersion(selection.version())
              .position(position++)
              .promptSnapshot(new HashMap<>(selection.version().getPromptDocJson()))
              .payloadSnapshot(payloadSnapshot)
              .answerKeySnapshot(new HashMap<>(selection.version().getAnswerKeyJson()))
              .points(selection.points())
              .build();

      quizAttemptQuestionRepository.save(attemptQuestion);
    }
  }

  private List<QuestionSelection> selectQuestionsForAttempt(Quiz quiz) {
    List<QuizSection> sections = quizSectionRepository.findByQuizIdOrderByPositionAsc(quiz.getId());

    if (sections.isEmpty()) {
      return quiz.getQuizQuestions().stream()
          .sorted(Comparator.comparingInt(QuizQuestion::getPosition))
          .map(
              quizQuestion ->
                  new QuestionSelection(
                      quizQuestion.getQuestion(),
                      questionVersionService.ensureLatestVersion(
                          quizQuestion.getQuestion().getId(), quiz.getCreatedBy()),
                      quizQuestion.getEffectivePoints()))
          .toList();
    }

    List<QuestionBank> pool = questionBankRepository.findActiveByCourseId(quiz.getCourseId());
    Map<UUID, BigDecimal> overridePoints = new HashMap<>();
    quiz.getQuizQuestions().forEach(qq -> overridePoints.put(qq.getQuestion().getId(), qq.getEffectivePoints()));

    Set<UUID> usedQuestionIds = new HashSet<>();
    List<QuestionSelection> selection = new ArrayList<>();

    for (QuizSection section : sections) {
      List<QuestionBank> sectionSelection = new ArrayList<>();
      int targetCount =
          section.getQuestionCount() != null && section.getQuestionCount() > 0
              ? section.getQuestionCount()
              : section.getRules().stream().map(rule -> Math.max(rule.getQuota(), 0)).reduce(0, Integer::sum);

      if (targetCount <= 0) {
        continue;
      }

      if (section.getRules() != null && !section.getRules().isEmpty()) {
        for (QuizSectionRule rule : section.getRules()) {
          List<QuestionBank> candidates =
              pool.stream()
                  .filter(q -> !usedQuestionIds.contains(q.getId()))
                  .filter(q -> matchesRule(q, rule))
                  .toList();

          List<QuestionBank> shuffled = new ArrayList<>(candidates);
          Collections.shuffle(shuffled);

          int quota = Math.max(0, rule.getQuota() == null ? 0 : rule.getQuota());
          for (QuestionBank candidate : shuffled) {
            if (quota <= 0) {
              break;
            }
            sectionSelection.add(candidate);
            usedQuestionIds.add(candidate.getId());
            quota -= 1;
            if (sectionSelection.size() >= targetCount) {
              break;
            }
          }

          if (sectionSelection.size() >= targetCount) {
            break;
          }
        }
      }

      if (sectionSelection.size() < targetCount) {
        List<QuestionBank> fallback =
            pool.stream().filter(q -> !usedQuestionIds.contains(q.getId())).toList();
        List<QuestionBank> shuffledFallback = new ArrayList<>(fallback);
        Collections.shuffle(shuffledFallback);

        for (QuestionBank candidate : shuffledFallback) {
          if (sectionSelection.size() >= targetCount) {
            break;
          }
          sectionSelection.add(candidate);
          usedQuestionIds.add(candidate.getId());
        }
      }

      for (QuestionBank question : sectionSelection) {
        QuestionVersion version =
            questionVersionService.ensureLatestVersion(question.getId(), quiz.getCreatedBy());
        BigDecimal points = overridePoints.getOrDefault(question.getId(), question.getPoints());
        selection.add(new QuestionSelection(question, version, points));
      }
    }

    if (selection.isEmpty() && !quiz.getQuizQuestions().isEmpty()) {
      return quiz.getQuizQuestions().stream()
          .sorted(Comparator.comparingInt(QuizQuestion::getPosition))
          .map(
              qq ->
                  new QuestionSelection(
                      qq.getQuestion(),
                      questionVersionService.ensureLatestVersion(qq.getQuestion().getId(), quiz.getCreatedBy()),
                      qq.getEffectivePoints()))
          .toList();
    }

    return selection;
  }

  private boolean matchesRule(QuestionBank question, QuizSectionRule rule) {
    if (rule.getQuestionType() != null
        && !rule.getQuestionType().equalsIgnoreCase(question.getQuestionType())) {
      return false;
    }

    String difficulty = question.getDifficulty();
    if ((difficulty == null || difficulty.isBlank()) && question.getMetadata() != null) {
      Object fromMeta = question.getMetadata().get("difficulty");
      if (fromMeta instanceof String value) {
        difficulty = value;
      }
    }

    if (rule.getDifficulty() != null
        && (difficulty == null || !rule.getDifficulty().equalsIgnoreCase(difficulty))) {
      return false;
    }

    if (rule.getTag() != null) {
      String requiredTag = rule.getTag().trim().toLowerCase(Locale.ROOT);
      boolean foundInTags =
          question.getTags() != null
              && question.getTags().stream()
                  .filter(Objects::nonNull)
                  .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
                  .anyMatch(requiredTag::equals);

      if (!foundInTags) {
        return false;
      }
    }

    return true;
  }

  private Map<String, Object> shuffleOptions(Map<String, Object> payload) {
    Map<String, Object> mutable = new HashMap<>(payload);
    Object options = mutable.get("options");

    if (options instanceof List<?> listOptions) {
      List<Object> shuffled = new ArrayList<>(listOptions);
      Collections.shuffle(shuffled);
      mutable.put("options", shuffled);
      return mutable;
    }

    if (options instanceof Map<?, ?> mapOptions) {
      Map<String, Object> mapped = new HashMap<>();
      mapOptions.forEach((key, value) -> mapped.put(String.valueOf(key), value));

      Object choices = mapped.get("choices");
      if (choices instanceof List<?> listChoices) {
        List<Object> shuffledChoices = new ArrayList<>(listChoices);
        Collections.shuffle(shuffledChoices);
        mapped.put("choices", shuffledChoices);
        mutable.put("options", mapped);
      }
      return mutable;
    }

    return mutable;
  }

  private BigDecimal calculateAndPersistAutoScore(QuizAttempt attempt, Map<String, Object> answers) {
    List<QuizAttemptQuestion> attemptQuestions =
        quizAttemptQuestionRepository.findByAttempt_IdOrderByPositionAsc(attempt.getId());

    BigDecimal total = BigDecimal.ZERO;

    for (QuizAttemptQuestion attemptQuestion : attemptQuestions) {
      Object userAnswer = answers.get(attemptQuestion.getId().toString());
      if (userAnswer == null) {
        userAnswer = answers.get(attemptQuestion.getQuestion().getId().toString());
      }

      if (userAnswer == null) {
        continue;
      }

      GradeOutcome outcome = gradeAttemptQuestion(attemptQuestion, userAnswer);
      total = total.add(outcome.scoreAwarded() == null ? BigDecimal.ZERO : outcome.scoreAwarded());

      QuizResponseEntry responseEntry =
          quizResponseEntryRepository
              .findByAttemptQuestion_Id(attemptQuestion.getId())
              .orElseGet(
                  () ->
                      QuizResponseEntry.builder()
                          .attempt(attempt)
                          .attemptQuestion(attemptQuestion)
                          .build());

      responseEntry.setResponseJson(toResponseMap(userAnswer));
      responseEntry.setIsCorrect(outcome.correct());
      responseEntry.setScoreAwarded(outcome.scoreAwarded());
      responseEntry.setFeedback(outcome.feedback());
      responseEntry.setGradedAt(LocalDateTime.now());

      quizResponseEntryRepository.save(responseEntry);
    }

    return total.setScale(2, RoundingMode.HALF_UP);
  }

  private GradeOutcome gradeAttemptQuestion(QuizAttemptQuestion attemptQuestion, Object userAnswer) {
    String questionType =
        Optional.ofNullable(attemptQuestion.getPayloadSnapshot().get("questionType"))
            .map(Object::toString)
            .orElse(attemptQuestion.getQuestion().getQuestionType())
            .trim()
            .toUpperCase(Locale.ROOT);

    Map<String, Object> answerKey = attemptQuestion.getAnswerKeySnapshot();
    BigDecimal points = attemptQuestion.getPoints();

    return switch (questionType) {
      case "MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE" -> {
        boolean correct = Objects.equals(readSingleChoice(answerKey), normalizeScalar(userAnswer));
        yield new GradeOutcome(correct, correct ? points : BigDecimal.ZERO, extractChoiceFeedback(attemptQuestion, userAnswer));
      }
      case "MULTIPLE_RESPONSE", "MULTI_SELECT" -> {
        Set<String> expected = readStringSet(answerKey.get("choices"));
        Set<String> actual = readStringSet(userAnswer);
        boolean correct = expected.equals(actual);
        yield new GradeOutcome(correct, correct ? points : BigDecimal.ZERO, null);
      }
      case "NUMERIC", "NUMERICAL" -> {
        BigDecimal score = gradeNumeric(answerKey, userAnswer, points);
        boolean correct = score.compareTo(points) == 0;
        yield new GradeOutcome(correct, score, null);
      }
      case "MATCHING" -> {
        BigDecimal fraction = gradeMatching(answerKey, userAnswer);
        BigDecimal score = points.multiply(fraction).setScale(2, RoundingMode.HALF_UP);
        yield new GradeOutcome(score.compareTo(points) == 0, score, null);
      }
      case "ORDERING" -> {
        BigDecimal fraction = gradeOrdering(answerKey, userAnswer);
        BigDecimal score = points.multiply(fraction).setScale(2, RoundingMode.HALF_UP);
        yield new GradeOutcome(score.compareTo(points) == 0, score, null);
      }
      case "SHORT_ANSWER" -> {
        BigDecimal score = gradeShortAnswer(answerKey, userAnswer, points);
        yield new GradeOutcome(score.compareTo(points) == 0, score, null);
      }
      case "ESSAY" -> new GradeOutcome(null, null, "Manual grading required");
      default -> new GradeOutcome(null, null, "Manual grading required");
    };
  }

  private String readSingleChoice(Map<String, Object> answerKey) {
    if (answerKey == null) {
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

  private BigDecimal gradeNumeric(Map<String, Object> answerKey, Object userAnswer, BigDecimal points) {
    try {
      BigDecimal correct = toBigDecimal(answerKey.get("value"));
      BigDecimal tolerance =
          answerKey.containsKey("tolerance") ? toBigDecimal(answerKey.get("tolerance")) : new BigDecimal("0.01");
      BigDecimal actual = toBigDecimal(userAnswer);

      BigDecimal diff = correct.subtract(actual).abs();
      BigDecimal allowed = correct.abs().multiply(tolerance);
      if (diff.compareTo(allowed) <= 0) {
        return points;
      }
      return BigDecimal.ZERO;
    } catch (Exception ex) {
      return BigDecimal.ZERO;
    }
  }

  private BigDecimal gradeMatching(Map<String, Object> answerKey, Object userAnswer) {
    Map<String, String> expected = toStringMap(answerKey.get("pairs"));
    Map<String, String> actual = toStringMap(userAnswer instanceof Map<?, ?> ? ((Map<?, ?>) userAnswer).get("pairs") : userAnswer);

    if (expected.isEmpty()) {
      return BigDecimal.ZERO;
    }

    int correct = 0;
    for (Map.Entry<String, String> entry : expected.entrySet()) {
      if (Objects.equals(entry.getValue(), actual.get(entry.getKey()))) {
        correct += 1;
      }
    }

    return BigDecimal.valueOf(correct)
        .divide(BigDecimal.valueOf(expected.size()), 4, RoundingMode.HALF_UP);
  }

  private BigDecimal gradeOrdering(Map<String, Object> answerKey, Object userAnswer) {
    List<String> expected = toStringList(answerKey.get("order"));
    List<String> actual = toStringList(userAnswer);

    if (expected.isEmpty()) {
      return BigDecimal.ZERO;
    }

    int matches = 0;
    for (int i = 0; i < Math.min(expected.size(), actual.size()); i++) {
      if (Objects.equals(expected.get(i), actual.get(i))) {
        matches += 1;
      }
    }

    return BigDecimal.valueOf(matches)
        .divide(BigDecimal.valueOf(expected.size()), 4, RoundingMode.HALF_UP);
  }

  private BigDecimal gradeShortAnswer(Map<String, Object> answerKey, Object userAnswer, BigDecimal points) {
    Set<String> accepted = new HashSet<>();
    accepted.addAll(readStringSet(answerKey.get("answers")));

    if (accepted.isEmpty() && answerKey.containsKey("answer")) {
      accepted.add(normalizeScalar(answerKey.get("answer")));
    }

    String actual = normalizeScalar(userAnswer);
    if (actual != null && accepted.contains(actual)) {
      return points;
    }

    return BigDecimal.ZERO;
  }

  private String extractChoiceFeedback(QuizAttemptQuestion attemptQuestion, Object userAnswer) {
    Object options = attemptQuestion.getPayloadSnapshot().get("options");
    if (!(options instanceof Map<?, ?> optionsMap)) {
      return null;
    }

    Object feedback = optionsMap.get("feedback");
    if (!(feedback instanceof Map<?, ?> feedbackMap)) {
      return null;
    }

    return Optional.ofNullable(feedbackMap.get(normalizeScalar(userAnswer))).map(Object::toString).orElse(null);
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

  private Map<String, String> toStringMap(Object value) {
    if (!(value instanceof Map<?, ?> map)) {
      return Map.of();
    }

    Map<String, String> converted = new HashMap<>();
    map.forEach((key, val) -> converted.put(String.valueOf(key), normalizeScalar(val)));
    return converted;
  }

  private String normalizeScalar(Object value) {
    if (value == null) {
      return null;
    }
    return value.toString().trim().toLowerCase(Locale.ROOT);
  }

  private BigDecimal toBigDecimal(Object value) {
    if (value instanceof BigDecimal decimal) {
      return decimal;
    }
    if (value instanceof Number number) {
      return BigDecimal.valueOf(number.doubleValue());
    }
    return new BigDecimal(String.valueOf(value));
  }

  private Map<String, Object> toResponseMap(Object userAnswer) {
    if (userAnswer instanceof Map<?, ?> map) {
      Map<String, Object> converted = new HashMap<>();
      map.forEach((k, v) -> converted.put(String.valueOf(k), v));
      return converted;
    }
    return Map.of("value", userAnswer);
  }

  private QuizAttempt findAttemptById(UUID attemptId) {
    return quizAttemptRepository
        .findById(attemptId)
        .orElseThrow(() -> new ResourceNotFoundException("QuizAttempt", "id", attemptId));
  }

  private Quiz findQuizById(UUID quizId) {
    return quizRepository
        .findById(quizId)
        .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", quizId));
  }

  private void ensureAttemptOwner(QuizAttempt attempt, UUID userId) {
    if (!attempt.getUserId().equals(userId)) {
      throw new ValidationException("You don't have permission to access this attempt");
    }
  }

  private void ensureAttemptAccessible(QuizAttempt attempt, UUID userId, String userRole) {
    if (isStaffRole(userRole)) {
      return;
    }
    ensureAttemptOwner(attempt, userId);
  }

  private boolean isStaffRole(String userRole) {
    if (userRole == null || userRole.isBlank()) {
      return false;
    }

    String normalized = userRole.trim().toUpperCase(Locale.ROOT);
    if (normalized.startsWith("ROLE_")) {
      normalized = normalized.substring("ROLE_".length());
    }

    return normalized.equals("TEACHER") || normalized.equals("TA") || normalized.equals("SUPERADMIN");
  }

  private QuizAttemptQuestionDto toDto(QuizAttemptQuestion question) {
    return QuizAttemptQuestionDto.builder()
        .id(question.getId())
        .attemptId(question.getAttempt().getId())
        .questionId(question.getQuestion().getId())
        .questionVersionId(question.getQuestionVersion() == null ? null : question.getQuestionVersion().getId())
        .position(question.getPosition())
        .points(question.getPoints())
        .promptSnapshot(question.getPromptSnapshot())
        .payloadSnapshot(question.getPayloadSnapshot())
        .build();
  }

  private record QuestionSelection(QuestionBank question, QuestionVersion version, BigDecimal points) {}

  private record GradeOutcome(Boolean correct, BigDecimal scoreAwarded, String feedback) {}
}
