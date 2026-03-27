package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for running code without tests (Run button).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunCodeRequest {

    @NotBlank(message = "Language is required")
    private String language;

    @NotBlank(message = "Code is required")
    private String code;

    private String stdin;

    @Builder.Default
    private int timeLimitSeconds = 5;

    @Builder.Default
    private int memoryLimitMb = 128;
}