package com.university.lms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PracticeQuizResponse {
    private String title;
    private List<PracticeQuestion> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PracticeQuestion {
        private String questionText;
        private String questionType; // MULTIPLE_CHOICE, TRUE_FALSE
        private List<String> options;
        private String correctAnswer;
        private String explanation;
        private int points;
    }
}
