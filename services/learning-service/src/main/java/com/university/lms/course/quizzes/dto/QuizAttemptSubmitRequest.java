package com.university.lms.course.quizzes.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record QuizAttemptSubmitRequest(
    @NotNull Map<String, Object> answers
) {}
