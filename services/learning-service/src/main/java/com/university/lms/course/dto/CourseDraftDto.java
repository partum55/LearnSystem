package com.university.lms.course.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record CourseDraftDto(
        CourseDraft course,
        List<ModuleDraft> modules
) {
    public record CourseDraft(
            String title,
            String code,
            String description,
            JsonNode syllabusJson,
            JsonNode resources,
            JsonNode topics,
            JsonNode lessonBlocks,
            JsonNode lesson_blocks,
            JsonNode visibility
    ) {}

    public record ModuleDraft(
            String title,
            String description,
            Integer orderIndex,
            List<LearningItemDraft> learningItems,
            List<AssignmentDraft> assignments,
            JsonNode resources,
            JsonNode topics,
            JsonNode lessonBlocks,
            JsonNode lesson_blocks
    ) {}

    public record LearningItemDraft(
            String type,
            String title,
            JsonNode contentJson,
            JsonNode resources,
            JsonNode topics,
            JsonNode lessonBlocks,
            JsonNode lesson_blocks
    ) {}

    public record AssignmentDraft(
            String type,
            String title,
            Integer points,
            JsonNode instructionsJson,
            JsonNode settings,
            JsonNode resources,
            JsonNode topics,
            JsonNode lessonBlocks,
            JsonNode lesson_blocks
    ) {}
}
