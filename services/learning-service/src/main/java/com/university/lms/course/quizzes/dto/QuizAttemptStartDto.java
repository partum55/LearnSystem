package com.university.lms.course.quizzes.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record QuizAttemptStartDto(
    UUID id,
    UUID assignmentId,
    int attemptNumber,
    String status,
    LocalDateTime startedAt,
    Integer timeLimitMinutes
) {}
