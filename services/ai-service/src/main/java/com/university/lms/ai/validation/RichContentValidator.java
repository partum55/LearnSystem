package com.university.lms.ai.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.exception.AiException;
import org.springframework.stereotype.Component;

@Component
public class RichContentValidator {

    public void validate(JsonNode contentJson) {
        if (contentJson == null || contentJson.isNull() || contentJson.isEmpty()) {
            return; // Empty is fine in some contexts, or we could require it
        }

        if (!contentJson.has("version") || contentJson.get("version").asInt() != 1) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "RichContentDocument must have version: 1");
        }

        if (!contentJson.has("type") || !"RICH_CONTENT".equals(contentJson.get("type").asText())) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "RichContentDocument must have type: 'RICH_CONTENT'");
        }

        if (!contentJson.has("blocks") || !contentJson.get("blocks").isArray()) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "RichContentDocument must have 'blocks' array");
        }

        for (JsonNode block : contentJson.get("blocks")) {
            if (!block.has("type") || !block.has("data")) {
                throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Each RichContent block must have 'type' and 'data'");
            }
        }
    }
}
