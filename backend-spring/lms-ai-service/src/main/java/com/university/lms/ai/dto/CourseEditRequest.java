package com.university.lms.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for editing existing course content with AI
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseEditRequest {

    @JsonProperty("prompt")
    private String prompt;

    @JsonProperty("entity_type")
    private String entityType; // COURSE, MODULE, ASSIGNMENT, QUIZ

    @JsonProperty("current_data")
    private String currentData; // JSON representation of current entity

    @JsonProperty("language")
    @Builder.Default
    private String language = "uk";
}

