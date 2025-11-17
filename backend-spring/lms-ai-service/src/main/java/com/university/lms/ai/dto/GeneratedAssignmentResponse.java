package com.university.lms.ai.dto;

import lombok.Data;
import java.util.List;

/**
 * Response containing AI-generated assignment
 */
@Data
public class GeneratedAssignmentResponse {
    private String title;
    private String description;
    private String instructions;
    private String assignmentType;
    private Integer maxPoints;
    private Integer timeLimit; // in minutes, optional
    private GradingRubric rubric;
    private List<String> learningObjectives;
    private List<String> resources;

    @Data
    public static class GradingRubric {
        private List<RubricCriterion> criteria;
    }

    @Data
    public static class RubricCriterion {
        private String name;
        private String description;
        private Integer maxPoints;
        private List<RubricLevel> levels;
    }

    @Data
    public static class RubricLevel {
        private String name; // e.g., "Excellent", "Good", "Satisfactory", "Poor"
        private Integer points;
        private String description;
    }
}
