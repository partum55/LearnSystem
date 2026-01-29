package com.university.lms.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

/**
 * Response containing AI-generated module
 */
@Data
public class GeneratedModuleResponse {
    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 5000)
    private String description;

    @Size(max = 25)
    private List<@NotBlank @Size(max = 200) String> learningObjectives;

    @NotEmpty
    @Size(max = 20)
    @Valid
    private List<Week> weeks;

    @Size(max = 20)
    private List<@NotBlank @Size(max = 200) String> assessmentStrategies;

    @Size(max = 30)
    @Valid
    private List<Resource> recommendedResources;

    @Data
    public static class Week {
        @NotNull
        @Min(1)
        @Max(52)
        private Integer weekNumber;

        @NotBlank
        @Size(max = 200)
        private String title;

        @NotBlank
        @Size(max = 4000)
        private String description;

        @Size(max = 20)
        private List<@NotBlank @Size(max = 200) String> topics;

        @Size(max = 20)
        @Valid
        private List<Activity> activities;

        @Size(max = 20)
        private List<@NotBlank @Size(max = 200) String> readings;
    }

    @Data
    public static class Activity {
        @NotBlank
        @Size(max = 50)
        private String type; // "lecture", "discussion", "lab", "project", etc.

        @NotBlank
        @Size(max = 200)
        private String title;

        @NotBlank
        @Size(max = 2000)
        private String description;

        @Min(10)
        @Max(480)
        private Integer duration; // in minutes
    }

    @Data
    public static class Resource {
        @NotBlank
        @Size(max = 50)
        private String type; // "book", "article", "video", "website", etc.

        @NotBlank
        @Size(max = 200)
        private String title;

        @NotBlank
        @Size(max = 2000)
        private String description;

        @Size(max = 500)
        private String url; // optional
    }
}
