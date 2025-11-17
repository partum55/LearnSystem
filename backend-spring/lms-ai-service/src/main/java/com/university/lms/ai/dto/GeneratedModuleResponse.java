package com.university.lms.ai.dto;

import lombok.Data;
import java.util.List;

/**
 * Response containing AI-generated module
 */
@Data
public class GeneratedModuleResponse {
    private String title;
    private String description;
    private List<String> learningObjectives;
    private List<Week> weeks;
    private List<String> assessmentStrategies;
    private List<Resource> recommendedResources;

    @Data
    public static class Week {
        private Integer weekNumber;
        private String title;
        private String description;
        private List<String> topics;
        private List<Activity> activities;
        private List<String> readings;
    }

    @Data
    public static class Activity {
        private String type; // "lecture", "discussion", "lab", "project", etc.
        private String title;
        private String description;
        private Integer duration; // in minutes
    }

    @Data
    public static class Resource {
        private String type; // "book", "article", "video", "website", etc.
        private String title;
        private String description;
        private String url; // optional
    }
}
