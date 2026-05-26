package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.lms.ai.domain.model.AiTaskType;

import java.util.Map;

public interface AiTaskHandler {
    AiTaskType getTaskType();
    JsonNode execute(Map<String, Object> context, Map<String, Object> input, String apiKey);
}
