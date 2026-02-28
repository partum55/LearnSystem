package com.university.lms.course.assessment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.university.lms.course.assessment.domain.*;
import com.university.lms.course.assessment.repository.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuizAttemptServiceTest {

  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Mock private QuizRepository quizRepository;
  @Mock private QuizSectionRepository quizSectionRepository;
  @Mock private QuestionBankRepository questionBankRepository;
  @Mock private QuestionVersionService questionVersionService;
  @Mock private QuizAttemptQuestionRepository quizAttemptQuestionRepository;
  @Mock private QuizResponseEntryRepository quizResponseEntryRepository;
  @Mock private AssessmentMapper assessmentMapper;

  private QuizAttemptService service;

  @BeforeEach
  void setUp() {
    service =
        new QuizAttemptService(
            quizAttemptRepository,
            quizRepository,
            quizSectionRepository,
            questionBankRepository,
            questionVersionService,
            quizAttemptQuestionRepository,
            quizResponseEntryRepository,
            assessmentMapper);
  }

  @Test
  void startQuizAttemptFreezesQuestionVersionSnapshots() {
    UUID quizId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID creatorId = UUID.randomUUID();
    UUID questionId = UUID.randomUUID();

    QuestionBank question =
        QuestionBank.builder()
            .id(questionId)
            .questionType("SINGLE_CHOICE")
            .stem("Q1")
            .points(new BigDecimal("3.00"))
            .createdBy(creatorId)
            .build();

    Quiz quiz =
        Quiz.builder()
            .id(quizId)
            .courseId(UUID.randomUUID())
            .title("Quiz")
            .attemptsAllowed(2)
            .shuffleQuestions(false)
            .shuffleAnswers(false)
            .createdBy(creatorId)
            .build();

    QuizQuestion quizQuestion =
        QuizQuestion.builder()
            .quiz(quiz)
            .question(question)
            .position(0)
            .pointsOverride(new BigDecimal("2.50"))
            .build();
    quiz.setQuizQuestions(new HashSet<>(List.of(quizQuestion)));

    QuestionVersion version =
        QuestionVersion.builder()
            .id(UUID.randomUUID())
            .question(question)
            .versionNumber(1)
            .promptDocJson(
                Map.of(
                    "type", "doc",
                    "content", List.of(Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", "Q1"))))))
            .payloadJson(Map.of("questionType", "SINGLE_CHOICE", "options", Map.of("choices", List.of("a", "b"))))
            .answerKeyJson(Map.of("choice", "a"))
            .createdBy(creatorId)
            .build();

    when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
    when(quizAttemptRepository.findInProgressAttempt(quizId, userId)).thenReturn(Optional.empty());
    when(quizAttemptRepository.countByQuizIdAndUserId(quizId, userId)).thenReturn(0L);
    when(quizSectionRepository.findByQuizIdOrderByPositionAsc(quizId)).thenReturn(List.of());
    when(questionVersionService.ensureLatestVersion(questionId, creatorId)).thenReturn(version);
    when(quizAttemptRepository.save(any(QuizAttempt.class)))
        .thenAnswer(
            invocation -> {
              QuizAttempt attempt = invocation.getArgument(0);
              if (attempt.getId() == null) {
                attempt.setId(UUID.randomUUID());
              }
              if (attempt.getStartedAt() == null) {
                attempt.setStartedAt(LocalDateTime.now());
              }
              return attempt;
            });

    QuizAttempt created = service.startQuizAttempt(quizId, userId, "127.0.0.1", "ua");

    assertNotNull(created.getId());
    verify(quizAttemptQuestionRepository).deleteByAttempt_Id(created.getId());

    ArgumentCaptor<QuizAttemptQuestion> frozenCaptor = ArgumentCaptor.forClass(QuizAttemptQuestion.class);
    verify(quizAttemptQuestionRepository).save(frozenCaptor.capture());
    QuizAttemptQuestion frozen = frozenCaptor.getValue();

    assertEquals(created.getId(), frozen.getAttempt().getId());
    assertEquals(questionId, frozen.getQuestion().getId());
    assertEquals(version.getId(), frozen.getQuestionVersion().getId());
    assertEquals(new BigDecimal("2.50"), frozen.getPoints());
  }

  @Test
  void submitQuizAttemptGradesSingleChoiceByAttemptQuestionId() {
    UUID quizId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID questionId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    UUID attemptQuestionId = UUID.randomUUID();

    QuestionBank question =
        QuestionBank.builder()
            .id(questionId)
            .questionType("SINGLE_CHOICE")
            .stem("Q1")
            .points(new BigDecimal("2.00"))
            .createdBy(UUID.randomUUID())
            .build();

    Quiz quiz =
        Quiz.builder()
            .id(quizId)
            .courseId(UUID.randomUUID())
            .title("Quiz")
            .attemptsAllowed(1)
            .createdBy(UUID.randomUUID())
            .build();

    QuizAttempt attempt =
        QuizAttempt.builder()
            .id(attemptId)
            .quiz(quiz)
            .userId(userId)
            .attemptNumber(1)
            .startedAt(LocalDateTime.now().minusMinutes(1))
            .build();

    QuizAttemptQuestion frozenQuestion =
        QuizAttemptQuestion.builder()
            .id(attemptQuestionId)
            .attempt(attempt)
            .question(question)
            .position(0)
            .points(new BigDecimal("2.00"))
            .payloadSnapshot(
                Map.of(
                    "questionType", "SINGLE_CHOICE",
                    "options", Map.of("feedback", Map.of("a", "Good job"))))
            .answerKeySnapshot(Map.of("choice", "a"))
            .build();

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(quizAttemptQuestionRepository.findByAttempt_IdOrderByPositionAsc(attemptId))
        .thenReturn(List.of(frozenQuestion));
    when(quizResponseEntryRepository.findByAttemptQuestion_Id(attemptQuestionId)).thenReturn(Optional.empty());
    when(quizResponseEntryRepository.save(any(QuizResponseEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(quizAttemptRepository.save(any(QuizAttempt.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    QuizAttempt submitted =
        service.submitQuizAttempt(attemptId, Map.of(attemptQuestionId.toString(), "A"), userId);

    assertNotNull(submitted.getSubmittedAt());
    assertEquals(new BigDecimal("2.00"), submitted.getAutoScore());
    assertEquals(new BigDecimal("2.00"), submitted.getFinalScore());

    ArgumentCaptor<QuizResponseEntry> responseCaptor = ArgumentCaptor.forClass(QuizResponseEntry.class);
    verify(quizResponseEntryRepository).save(responseCaptor.capture());

    QuizResponseEntry response = responseCaptor.getValue();
    assertEquals(Boolean.TRUE, response.getIsCorrect());
    assertEquals(new BigDecimal("2.00"), response.getScoreAwarded());
    assertEquals("Good job", response.getFeedback());
  }
}
