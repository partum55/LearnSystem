package com.university.lms.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PracticeQuizRequest {

    @NotBlank
    private String courseId;

    @NotBlank
    private String moduleId;

    private int questionCount = 5;
    private String difficulty = "medium";
    private String language = "en";
}
