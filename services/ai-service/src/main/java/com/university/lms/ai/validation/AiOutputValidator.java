package com.university.lms.ai.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.lms.ai.exception.AiOutputInvalidException;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AiOutputValidator {

    private static final Set<String> ASSIGNMENT_TYPES = Set.of("TEXT_SUBMISSION");
    private static final Set<String> COURSE_ITEM_TYPES = Set.of("RTE", "LESSON");

    private final RichContentValidator richContentValidator;

    public AiOutputValidator(RichContentValidator richContentValidator) {
        this.richContentValidator = richContentValidator;
    }

    public void validateCourseDraft(JsonNode output) {
        requireObject(output, "output");
        require(output, "course", "output.course", "object");
        require(output, "modules", "output.modules", "array");

        JsonNode course = output.get("course");
        requireObject(course, "output.course");
        requireText(course, "title", "output.course.title");
        requireText(course, "code", "output.course.code");
        requireText(course, "description", "output.course.description");
        require(course, "syllabusJson", "output.course.syllabusJson", "RichContentDocument");
        richContentValidator.validateRequired(course.get("syllabusJson"), "output.course.syllabusJson");

        JsonNode modules = output.get("modules");
        if (!modules.isArray()) {
            invalid("output.modules", "array", modules);
        }

        for (int i = 0; i < modules.size(); i++) {
            validateCourseModule(modules.get(i), "output.modules[" + i + "]");
        }
    }

    private void validateCourseModule(JsonNode module, String path) {
        requireObject(module, path);
        requireText(module, "title", path + ".title");
        requireText(module, "description", path + ".description");
        require(module, "learningItems", path + ".learningItems", "array");
        require(module, "assignments", path + ".assignments", "array");

        JsonNode learningItems = module.get("learningItems");
        if (!learningItems.isArray()) {
            invalid(path + ".learningItems", "array", learningItems);
        }
        for (int i = 0; i < learningItems.size(); i++) {
            validateCourseLearningItem(learningItems.get(i), path + ".learningItems[" + i + "]");
        }

        JsonNode assignments = module.get("assignments");
        if (!assignments.isArray()) {
            invalid(path + ".assignments", "array", assignments);
        }
        for (int i = 0; i < assignments.size(); i++) {
            validateCourseAssignmentDraft(assignments.get(i), path + ".assignments[" + i + "]");
        }
    }

    private void validateCourseLearningItem(JsonNode output, String path) {
        requireObject(output, path);
        requireEnum(output, "type", COURSE_ITEM_TYPES, path + ".type");
        requireText(output, "title", path + ".title");
        require(output, "contentJson", path + ".contentJson", "RichContentDocument");
        richContentValidator.validateRequired(output.get("contentJson"), path + ".contentJson");
    }

    private void validateCourseAssignmentDraft(JsonNode output, String path) {
        requireObject(output, path);
        validateAssignmentDraft(output, path);
    }

    public void validateRteMaterial(JsonNode output) {
        requireObject(output, "output");
        requireText(output, "title", "output.title");
        require(output, "contentJson", "output.contentJson", "RichContentDocument");
        richContentValidator.validateRequired(output.get("contentJson"), "output.contentJson");
    }

    public void validateAssignmentDraft(JsonNode output) {
        validateAssignmentDraft(output, "output");
    }

    private void validateAssignmentDraft(JsonNode output, String path) {
        requireObject(output, path);
        requireEnum(output, "type", ASSIGNMENT_TYPES, path + ".type");
        requireText(output, "title", path + ".title");
        require(output, "points", path + ".points", "positive integer");
        JsonNode points = output.get("points");
        if (!points.isNumber() || points.asDouble() <= 0) {
            invalid(path + ".points", "positive number", points);
        }
        require(output, "instructionsJson", path + ".instructionsJson", "RichContentDocument");
        richContentValidator.validateRequired(output.get("instructionsJson"), path + ".instructionsJson");
        require(output, "settings", path + ".settings", "object");
        if (!output.get("settings").isObject()) {
            invalid(path + ".settings", "object", output.get("settings"));
        }
    }

    public void validateGradeSuggestion(JsonNode output) {
        requireObject(output, "output");
        require(output, "suggestedScore", "output.suggestedScore", "number");
        require(output, "feedbackJson", "output.feedbackJson", "RichContentDocument");
        JsonNode suggestedScore = output.get("suggestedScore");
        if (!suggestedScore.isNumber()) {
            invalid("output.suggestedScore", "number", suggestedScore);
        }
        richContentValidator.validateRequired(output.get("feedbackJson"), "output.feedbackJson");
    }

    private void require(JsonNode object, String field, String path, String expected) {
        if (object == null || !object.has(field) || object.get(field).isNull()) {
            invalid(path, expected, null);
        }
    }

    private void requireObject(JsonNode node, String path) {
        if (node == null || !node.isObject()) {
            invalid(path, "object", node);
        }
    }

    private void requireText(JsonNode object, String field, String path) {
        require(object, field, path, "non-empty string");
        JsonNode value = object.get(field);
        if (!value.isTextual() || value.asText().isBlank()) {
            invalid(path, "non-empty string", value);
        }
    }

    private void requireEnum(JsonNode object, String field, Set<String> allowed, String path) {
        require(object, field, path, "one of " + allowed);
        JsonNode value = object.get(field);
        if (!value.isTextual() || !allowed.contains(value.asText())) {
            invalid(path, "one of " + allowed, value);
        }
    }

    private void invalid(String path, String expected, JsonNode actual) {
        throw new AiOutputInvalidException("%s expected %s actual %s".formatted(
                path,
                expected,
                describe(actual)
        ));
    }

    private String describe(JsonNode actual) {
        if (actual == null || actual.isMissingNode() || actual.isNull()) {
            return "missing";
        }
        if (actual.isObject()) {
            return "object";
        }
        if (actual.isArray()) {
            return "array";
        }
        if (actual.isTextual()) {
            String value = actual.asText();
            return "string" + (value.length() <= 80 ? " '" + value + "'" : "");
        }
        if (actual.isIntegralNumber()) {
            return "integer " + actual.asLong();
        }
        if (actual.isNumber()) {
            return "number " + actual.asDouble();
        }
        if (actual.isBoolean()) {
            return "boolean " + actual.asBoolean();
        }
        return actual.getNodeType().name().toLowerCase();
    }
}
