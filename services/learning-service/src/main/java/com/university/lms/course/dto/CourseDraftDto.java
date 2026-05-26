package com.university.lms.course.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;

public record CourseDraftDto(
        CourseDraft course,
        List<ModuleDraft> modules
) {
    public record CourseDraft(
            String title,
            String code,
            String description,
            JsonNode syllabusJson
    ) {}

    public record ModuleDraft(
            String title,
            String description,
            Integer orderIndex,
            List<LearningItemDraft> learningItems,
            List<AssignmentDraft> assignments
    ) {}

    public record LearningItemDraft(
            String type,
            String title,
            JsonNode contentJson
    ) {}

    public record AssignmentDraft(
            String type,
            String title,
            Integer points,
            JsonNode instructionsJson,
            JsonNode settings
    ) {}
}
