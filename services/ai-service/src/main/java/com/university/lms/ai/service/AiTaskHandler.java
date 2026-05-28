package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.lms.ai.domain.model.AiTaskType;

import java.util.Map;
import java.util.UUID;

public interface AiTaskHandler {
    AiTaskType getTaskType();
    JsonNode execute(Map<String, Object> context, Map<String, Object> input, UUID userId, String apiKey);
}
