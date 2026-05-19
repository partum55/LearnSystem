package com.university.lms.course.assessment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for quiz questions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionDto {

    private UUID id;
    private UUID quizId;
    private UUID questionId;
    private Integer position;
    private BigDecimal pointsOverride;
    private BigDecimal effectivePoints;

    // Include question details if needed
    private QuestionDto question;
}

