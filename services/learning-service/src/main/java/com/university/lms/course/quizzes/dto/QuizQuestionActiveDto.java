package com.university.lms.course.quizzes.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public record QuizQuestionActiveDto(
    UUID questionId,
    String type,
    int order,
    String text,
    String stem,
    BigDecimal points,
    Map<String, Object> options,
    Object studentAnswer
) {}
