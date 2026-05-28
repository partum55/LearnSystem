package com.university.lms.ai.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.lms.ai.exception.AiOutputInvalidException;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class RichContentValidator {

    private static final Set<String> BLOCK_TYPES = Set.of(
            "heading", "paragraph", "list", "quote", "code", "mermaid", "math"
    );

    public void validate(JsonNode contentJson) {
        validate(contentJson, "RichContentDocument", false);
    }

    public void validate(JsonNode contentJson, String path) {
        validate(contentJson, path, false);
    }

    public void validateRequired(JsonNode contentJson) {
        validateRequired(contentJson, "RichContentDocument");
    }

    public void validateRequired(JsonNode contentJson, String path) {
        validate(contentJson, path, true);
    }

    private void validate(JsonNode contentJson, String path, boolean required) {
        if (contentJson == null || contentJson.isNull() || contentJson.isMissingNode()) {
            if (required) {
                invalid(path, "object RichContentDocument", contentJson);
            }
            return;
        }
        if (!contentJson.isObject()) {
            invalid(path, "object RichContentDocument", contentJson);
        }
        if (!contentJson.has("version")) {
            invalid(path + ".version", "integer 1", null);
        }
        if (!contentJson.get("version").isIntegralNumber() || contentJson.get("version").asInt() != 1) {
            invalid(path + ".version", "integer 1", contentJson.get("version"));
        }

        if (!contentJson.has("type")) {
            invalid(path + ".type", "string RICH_CONTENT", null);
        }
        if (!contentJson.get("type").isTextual() || !"RICH_CONTENT".equals(contentJson.get("type").asText())) {
            invalid(path + ".type", "string RICH_CONTENT", contentJson.get("type"));
        }

        if (!contentJson.has("blocks")) {
            invalid(path + ".blocks", "array", null);
        }
        JsonNode blocks = contentJson.get("blocks");
        if (!blocks.isArray()) {
            invalid(path + ".blocks", "array", blocks);
        }

        for (int i = 0; i < blocks.size(); i++) {
            validateBlock(blocks.get(i), path + ".blocks[" + i + "]");
        }
    }

    private void validateBlock(JsonNode block, String path) {
        if (block == null || !block.isObject()) {
            invalid(path, "object RichContent block", block);
        }
        if (!block.has("type")) {
            invalid(path + ".type", "one of " + BLOCK_TYPES, null);
        }
        JsonNode type = block.get("type");
        if (!type.isTextual() || !BLOCK_TYPES.contains(type.asText())) {
            invalid(path + ".type", "one of " + BLOCK_TYPES, type);
        }
        if (!block.has("data")) {
            invalid(path + ".data", "object", null);
        }
        JsonNode data = block.get("data");
        if (!data.isObject()) {
            invalid(path + ".data", "object", data);
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
