package com.university.lms.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

/**
 * Response containing AI-generated quiz
 */
@Data
public class GeneratedQuizResponse {
    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 4000)
    private String description;

    @NotNull
    @Min(5)
    @Max(180)
    private Integer timeLimit; // in minutes

    @NotNull
    @Min(1)
    @Max(10)
    private Integer attemptsAllowed;

    @NotEmpty
    @Size(max = 50)
    @Valid
    private List<GeneratedQuestion> questions;

    @Data
    public static class GeneratedQuestion {
        @NotBlank
        @Size(max = 2000)
        private String questionText;

        @NotBlank
        @Size(max = 50)
        private String questionType;

        @NotNull
        @Min(1)
        @Max(100)
        private Integer points;

        @Valid
        @Size(max = 10)
        private List<AnswerOption> answerOptions;

        @Size(max = 1000)
        private String correctAnswer; // For non-multiple choice

        @Size(max = 2000)
        private String explanation;
    }

    @Data
    public static class AnswerOption {
        @NotBlank
        @Size(max = 500)
        private String text;

        @NotNull
        private Boolean isCorrect;

        @Size(max = 1000)
        private String feedback;
    }
}
