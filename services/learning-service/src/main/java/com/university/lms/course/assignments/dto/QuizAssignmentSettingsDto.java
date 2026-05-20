package com.university.lms.course.assignments.dto;

import jakarta.validation.constraints.Min;

public record QuizAssignmentSettingsDto(
    @Min(1) Integer attemptLimit,
    @Min(1) Integer timeLimitMinutes,
    Boolean canReviewAttempts,
    Boolean showCorrectAnswers,
    Boolean showScoreAfterSubmit,
    Boolean shuffleQuestions,
    String gradingMode
) {}
