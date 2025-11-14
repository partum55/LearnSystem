package com.university.lms.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for generating course content with AI
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseGenerationRequest {

    @JsonProperty("prompt")
    private String prompt;

    @JsonProperty("language")
    @Builder.Default
    private String language = "uk"; // uk or en

    @JsonProperty("include_modules")
    @Builder.Default
    private Boolean includeModules = true;

    @JsonProperty("include_assignments")
    @Builder.Default
    private Boolean includeAssignments = false;

    @JsonProperty("include_quizzes")
    @Builder.Default
    private Boolean includeQuizzes = false;

    @JsonProperty("academic_year")
    private String academicYear;
}

