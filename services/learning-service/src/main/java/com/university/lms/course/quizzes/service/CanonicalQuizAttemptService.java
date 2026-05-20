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
import java.time.LocalDateTime;
import java.util.HashMap;
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
    attempt.setAnswers(new HashMap<>(request.answers()));
    attempt.setSubmittedAt(LocalDateTime.now());
    attempt.setAutoScore(BigDecimal.ZERO);
    attempt.setFinalScore(BigDecimal.ZERO);
    attempt = quizAttemptRepository.save(attempt);
    gradebookService.recordQuizAttempt(assignment, attempt);
    return review(attempt.getId(), userId);
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
    accessService.requireActiveMember(assignment.getCourseId(), userId);
    boolean showAnswers = teacher || (attempt.isSubmitted() && attempt.getQuiz().canShowCorrectAnswers());
    return new QuizAttemptReviewDto(
        attempt.getId(),
        assignment.getId(),
        attempt.getAttemptNumber(),
        attempt.isSubmitted() ? "submitted" : "in_progress",
        attempt.getStartedAt(),
        attempt.getSubmittedAt(),
        attempt.getAnswers(),
        attempt.getAutoScore(),
        attempt.getFinalScore(),
        showAnswers);
  }

  private Assignment requireQuizAssignment(UUID assignmentId) {
    Assignment assignment = assignmentRepository.findById(assignmentId)
        .orElseThrow(() -> ApiException.notFound("Assignment"));
    if (assignment.getQuizId() == null || !"QUIZ".equalsIgnoreCase(assignment.getAssignmentType())) {
      throw ApiException.badRequest("NOT_A_QUIZ_ASSIGNMENT", "Assignment is not a quiz assignment");
    }
    return assignment;
  }
}
