package com.university.lms.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

/**
 * Response containing AI-generated assignment
 */
@Data
public class GeneratedAssignmentResponse {
    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 4000)
    private String description;

    @NotBlank
    @Size(max = 8000)
    private String instructions;

    @NotBlank
    @Size(max = 30)
    private String assignmentType;

    @NotNull
    @Min(1)
    @Max(1000)
    private Integer maxPoints;

    @Min(5)
    @Max(600)
    private Integer timeLimit; // in minutes, optional

    @Valid
    private GradingRubric rubric;

    @Size(max = 25)
    private List<@NotBlank @Size(max = 200) String> learningObjectives;

    @Size(max = 25)
    private List<@NotBlank @Size(max = 500) String> resources;

    @Data
    public static class GradingRubric {
        @Size(min = 1, max = 15)
        @Valid
        private List<RubricCriterion> criteria;
    }

    @Data
    public static class RubricCriterion {
        @NotBlank
        @Size(max = 200)
        private String name;

        @NotBlank
        @Size(max = 2000)
        private String description;

        @NotNull
        @Min(1)
        @Max(1000)
        private Integer maxPoints;

        @Size(min = 2, max = 6)
        @Valid
        private List<RubricLevel> levels;
    }

    @Data
    public static class RubricLevel {
        @NotBlank
        @Size(max = 100)
        private String name; // e.g., "Excellent", "Good", "Satisfactory", "Poor"

        @NotNull
        @Min(0)
        @Max(1000)
        private Integer points;

        @NotBlank
        @Size(max = 1000)
        private String description;
    }
}
