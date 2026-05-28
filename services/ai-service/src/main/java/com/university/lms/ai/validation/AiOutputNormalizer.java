package com.university.lms.ai.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class AiOutputNormalizer {

    private static final Set<String> ASSIGNMENT_TYPES = Set.of("TEXT_SUBMISSION");
    private static final Set<String> COURSE_ITEM_TYPES = Set.of("RTE", "LESSON");

    private final ObjectMapper mapper;

    public AiOutputNormalizer(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public JsonNode normalizeRteMaterial(JsonNode output) {
        if (output == null || !output.isObject()) {
            return output;
        }
        ObjectNode normalized = mapper.createObjectNode();
        copyTrimmedText(output, normalized, "title");
        copyRichContent(output, normalized, "contentJson");
        return normalized;
    }

    public JsonNode normalizeAssignment(JsonNode output) {
        if (output == null || !output.isObject()) {
            return output;
        }
        return normalizeAssignment(output, true);
    }

    public JsonNode normalizeCourseDraft(JsonNode output) {
        if (output == null || !output.isObject()) {
            return output;
        }
        ObjectNode normalized = mapper.createObjectNode();
        if (output.has("course") && output.get("course").isObject()) {
            ObjectNode course = mapper.createObjectNode();
            JsonNode source = output.get("course");
            copyTrimmedText(source, course, "title");
            copyTrimmedText(source, course, "code");
            copyTrimmedText(source, course, "description");
            copyRichContent(source, course, "syllabusJson");
            normalized.set("course", course);
        }
        if (output.has("modules") && output.get("modules").isArray()) {
            ArrayNode modules = mapper.createArrayNode();
            for (JsonNode module : output.get("modules")) {
                modules.add(normalizeModule(module));
            }
            normalized.set("modules", modules);
        }
        return normalized;
    }

    public JsonNode normalizeGradeSuggestion(JsonNode output) {
        if (output == null || !output.isObject()) {
            return output;
        }
        ObjectNode normalized = mapper.createObjectNode();
        if (output.has("suggestedScore")) {
            normalized.set("suggestedScore", normalizePositiveNumber(output.get("suggestedScore"), 0));
        }
        if (output.has("maxScore")) {
            normalized.set("maxScore", normalizePositiveNumber(output.get("maxScore"), 1));
        }
        copyRichContent(output, normalized, "feedbackJson");
        if (output.has("reasoningSummary") && output.get("reasoningSummary").isArray()) {
            normalized.set("reasoningSummary", output.get("reasoningSummary"));
        }
        if (output.has("rubricBreakdown") && output.get("rubricBreakdown").isArray()) {
            normalized.set("rubricBreakdown", output.get("rubricBreakdown"));
        }
        return normalized;
    }

    private ObjectNode normalizeModule(JsonNode module) {
        ObjectNode normalized = mapper.createObjectNode();
        if (module == null || !module.isObject()) {
            return normalized;
        }
        copyTrimmedText(module, normalized, "title");
        copyTrimmedText(module, normalized, "description");
        if (module.has("orderIndex")) {
            normalized.set("orderIndex", module.get("orderIndex"));
        }
        if (module.has("learningItems") && module.get("learningItems").isArray()) {
            ArrayNode items = mapper.createArrayNode();
            for (JsonNode item : module.get("learningItems")) {
                items.add(normalizeCourseItem(item));
            }
            normalized.set("learningItems", items);
        }
        if (module.has("assignments") && module.get("assignments").isArray()) {
            ArrayNode assignments = mapper.createArrayNode();
            for (JsonNode assignment : module.get("assignments")) {
                assignments.add(normalizeAssignment(assignment, true));
            }
            normalized.set("assignments", assignments);
        }
        return normalized;
    }

    private ObjectNode normalizeCourseItem(JsonNode item) {
        ObjectNode normalized = mapper.createObjectNode();
        if (item == null || !item.isObject()) {
            return normalized;
        }
        copyCanonicalEnum(item, normalized, "type", COURSE_ITEM_TYPES);
        copyTrimmedText(item, normalized, "title");
        copyRichContent(item, normalized, "contentJson");
        return normalized;
    }

    private ObjectNode normalizeAssignment(JsonNode output, boolean ensureSettings) {
        ObjectNode normalized = mapper.createObjectNode();
        if (output == null || !output.isObject()) {
            return normalized;
        }
        copyCanonicalEnum(output, normalized, "type", ASSIGNMENT_TYPES);
        copyTrimmedText(output, normalized, "title");
        if (output.has("points")) {
            normalized.set("points", normalizePositiveNumber(output.get("points"), 1));
        }
        copyRichContent(output, normalized, "instructionsJson");
        if (output.has("settings") && output.get("settings").isObject()) {
            normalized.set("settings", output.get("settings"));
        } else if (ensureSettings) {
            normalized.set("settings", mapper.createObjectNode());
        }
        return normalized;
    }

    private void copyTrimmedText(JsonNode source, ObjectNode target, String field) {
        if (source.has(field) && source.get(field).isTextual()) {
            target.put(field, source.get(field).asText().trim());
        } else if (source.has(field)) {
            target.set(field, source.get(field));
        }
    }

    private void copyCanonicalEnum(JsonNode source, ObjectNode target, String field, Set<String> allowed) {
        if (source.has(field) && source.get(field).isTextual()) {
            String value = source.get(field).asText().trim().toUpperCase();
            target.put(field, allowed.contains(value) ? value : source.get(field).asText().trim());
        } else if (source.has(field)) {
            target.set(field, source.get(field));
        }
    }

    private void copyRichContent(JsonNode source, ObjectNode target, String field) {
        if (source.has(field) && source.get(field).isObject()) {
            target.set(field, normalizeRichContent(source.get(field)));
        } else if (source.has(field)) {
            target.set(field, source.get(field));
        }
    }

    private JsonNode normalizeRichContent(JsonNode content) {
        ObjectNode normalized = mapper.createObjectNode();
        copyIntegral(content, normalized, "version");
        copyTrimmedText(content, normalized, "type");
        if (content.has("blocks") && content.get("blocks").isArray()) {
            ArrayNode blocks = mapper.createArrayNode();
            for (JsonNode block : content.get("blocks")) {
                blocks.add(normalizeBlock(block));
            }
            normalized.set("blocks", blocks);
        }
        return normalized;
    }

    private ObjectNode normalizeBlock(JsonNode block) {
        ObjectNode normalized = mapper.createObjectNode();
        if (block == null || !block.isObject()) {
            return normalized;
        }
        copyTrimmedText(block, normalized, "type");
        if (block.has("data") && block.get("data").isObject()) {
            normalized.set("data", block.get("data"));
        } else if (block.has("data")) {
            normalized.set("data", block.get("data"));
        }
        return normalized;
    }

    private void copyIntegral(JsonNode source, ObjectNode target, String field) {
        if (source.has(field)) {
            target.set(field, source.get(field));
        }
    }

    private JsonNode normalizePositiveNumber(JsonNode value, int minimum) {
        if (value != null && value.isNumber()) {
            if (value.isIntegralNumber()) {
                return mapper.getNodeFactory().numberNode(Math.max(minimum, value.asInt()));
            }
            return mapper.getNodeFactory().numberNode(Math.max((double) minimum, value.asDouble()));
        }
        return value;
    }
}
