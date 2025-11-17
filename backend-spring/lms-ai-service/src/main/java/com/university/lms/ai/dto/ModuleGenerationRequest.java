package com.university.lms.ai.dto;

import lombok.Data;

/**
 * Request for AI-powered course module generation
 */
@Data
public class ModuleGenerationRequest {
    private String topic;
    private String language; // "uk" or "en"
    private Integer weekDuration; // Duration in weeks
    private String difficulty; // "beginner", "intermediate", "advanced"
    private Boolean includeLearningObjectives;
    private Boolean includeReadingMaterials;
    private Boolean includeActivities;
    private String context; // Additional context about the course
}
