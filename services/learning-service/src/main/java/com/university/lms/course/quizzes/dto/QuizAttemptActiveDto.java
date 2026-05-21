package com.university.lms.course.quizzes.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record QuizAttemptActiveDto(
    UUID id,
    UUID assignmentId,
    String quizTitle,
    int attemptNumber,
    String status,
    LocalDateTime startedAt,
    Integer timeLimitMinutes,
    Long remainingSeconds,
    List<QuizQuestionActiveDto> questions
) {}
