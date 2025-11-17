package com.university.lms.ai.dto;

import lombok.Data;
import java.util.List;

/**
 * Response containing AI-generated quiz
 */
@Data
public class GeneratedQuizResponse {
    private String title;
    private String description;
    private Integer timeLimit; // in minutes
    private Integer attemptsAllowed;
    private List<GeneratedQuestion> questions;

    @Data
    public static class GeneratedQuestion {
        private String questionText;
        private String questionType;
        private Integer points;
        private List<AnswerOption> answerOptions;
        private String correctAnswer; // For non-multiple choice
        private String explanation;
    }

    @Data
    public static class AnswerOption {
        private String text;
        private Boolean isCorrect;
        private String feedback;
    }
}
