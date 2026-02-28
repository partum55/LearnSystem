package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Inline quiz payload used when creating/updating QUIZ assignments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InlineQuizRequest {

    @Size(max = 255)
    private String title;

    private String description;

    @Min(1)
    @Max(1440)
    private Integer timeLimit;

    @Min(1)
    private Integer attemptsAllowed;

    private Boolean shuffleQuestions;
    private Boolean shuffleAnswers;
    private Boolean showCorrectAnswers;
    private LocalDateTime showCorrectAnswersAt;

    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal passPercentage;
}
