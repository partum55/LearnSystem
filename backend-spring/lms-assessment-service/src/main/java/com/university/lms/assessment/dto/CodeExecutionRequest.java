package com.university.lms.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for code execution request.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeExecutionRequest {

    @NotNull(message = "Assignment ID is required")
    private UUID assignmentId;

    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Programming language is required")
    private String language;

    private String input; // Optional input for the program
}
