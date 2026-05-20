package com.university.lms.course.quizzes.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public record QuizAttemptReviewDto(
    UUID id,
    UUID assignmentId,
    int attemptNumber,
    String status,
    LocalDateTime startedAt,
    LocalDateTime submittedAt,
    Map<String, Object> answers,
    BigDecimal autoScore,
    BigDecimal finalScore,
    boolean correctAnswersVisible
) {}
