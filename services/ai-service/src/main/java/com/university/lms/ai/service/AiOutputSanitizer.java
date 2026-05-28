package com.university.lms.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.util.Iterator;
import java.util.Map;

public final class AiOutputSanitizer {

    private static final int MAX_RAW_OUTPUT_CHARS = 12_000;

    private AiOutputSanitizer() {}

    public static String sanitizedJson(JsonNode output, ObjectMapper mapper) {
        if (output == null || output.isNull()) {
            return null;
        }
        try {
            return mapper.writeValueAsString(sanitizeNode(output, mapper));
        } catch (JsonProcessingException exception) {
            return rawOutputJson(output.toString(), mapper);
        }
    }

    public static String rawOutputJson(String rawOutput, ObjectMapper mapper) {
        ObjectNode node = mapper.createObjectNode();
        String sanitized = sanitizeText(rawOutput == null ? "" : rawOutput);
        boolean truncated = sanitized.length() > MAX_RAW_OUTPUT_CHARS;
        node.put(
                "rawProviderOutput",
                truncated ? sanitized.substring(0, MAX_RAW_OUTPUT_CHARS) : sanitized);
        node.put("truncated", truncated);
        try {
            return mapper.writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            return "{\"rawProviderOutput\":\"<unavailable>\",\"truncated\":true}";
        }
    }

    private static JsonNode sanitizeNode(JsonNode node, ObjectMapper mapper) {
        if (node == null || node.isNull()) {
            return node;
        }
        if (node.isTextual()) {
            return TextNode.valueOf(sanitizeText(node.asText()));
        }
        if (node.isArray()) {
            ArrayNode array = mapper.createArrayNode();
            for (JsonNode child : node) {
                array.add(sanitizeNode(child, mapper));
            }
            return array;
        }
        if (node.isObject()) {
            ObjectNode object = mapper.createObjectNode();
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                object.set(field.getKey(), sanitizeNode(field.getValue(), mapper));
            }
            return object;
        }
        return node;
    }

    private static String sanitizeText(String text) {
        return text
                .replaceAll("AIza[0-9A-Za-z_\\-]{20,}", "[redacted-api-key]")
                .replaceAll("(?i)bearer\\s+[0-9A-Za-z._\\-]{20,}", "Bearer [redacted-token]")
                .replaceAll("(?i)(api[_-]?key\\s*[:=]\\s*)[0-9A-Za-z._\\-]{16,}", "$1[redacted]");
    }
}
