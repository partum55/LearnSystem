package com.university.lms.ai.dto;

import lombok.Data;

/**
 * Request for AI-powered assignment generation
 */
@Data
public class AssignmentGenerationRequest {
    private String topic;
    private String language; // "uk" or "en"
    private String assignmentType; // "FILE_UPLOAD", "TEXT", "CODE", "QUIZ"
    private String difficulty; // "easy", "medium", "hard"
    private Integer maxPoints;
    private String context; // Additional context about the course/module
    private Boolean includeRubric; // Whether to generate grading rubric
}
