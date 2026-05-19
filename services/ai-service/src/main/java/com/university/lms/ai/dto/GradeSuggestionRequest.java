package com.university.lms.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GradeSuggestionRequest {

    @NotBlank
    private String assignmentId;

    @NotBlank
    private String submissionId;
}
