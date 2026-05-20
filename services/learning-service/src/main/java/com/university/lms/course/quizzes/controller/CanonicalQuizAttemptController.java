package com.university.lms.course.quizzes.controller;

import com.university.lms.course.quizzes.dto.QuizAttemptReviewDto;
import com.university.lms.course.quizzes.dto.QuizAttemptStartDto;
import com.university.lms.course.quizzes.dto.QuizAttemptSubmitRequest;
import com.university.lms.course.quizzes.service.CanonicalQuizAttemptService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CanonicalQuizAttemptController {
  private final CanonicalQuizAttemptService quizAttemptService;
  private final RequestUserContext userContext;

  @PostMapping("/assignments/{assignmentId}/quiz-attempts")
  @ResponseStatus(HttpStatus.CREATED)
  public QuizAttemptStartDto start(@PathVariable UUID assignmentId) {
    return quizAttemptService.start(assignmentId, userContext.requireUserId());
  }

  @PostMapping("/quiz-attempts/{attemptId}/submit")
  public QuizAttemptReviewDto submit(
      @PathVariable UUID attemptId,
      @Valid @RequestBody QuizAttemptSubmitRequest request) {
    return quizAttemptService.submit(attemptId, userContext.requireUserId(), request);
  }

  @GetMapping("/quiz-attempts/{attemptId}/review")
  public QuizAttemptReviewDto review(@PathVariable UUID attemptId) {
    return quizAttemptService.review(attemptId, userContext.requireUserId());
  }
}
