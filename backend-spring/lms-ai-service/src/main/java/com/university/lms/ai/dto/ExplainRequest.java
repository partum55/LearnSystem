package com.university.lms.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExplainRequest {

    @NotBlank
    private String contentType; // RESOURCE, ASSIGNMENT, QUIZ_QUESTION, MODULE

    @NotBlank
    private String contentText;

    private String language = "en";
}
