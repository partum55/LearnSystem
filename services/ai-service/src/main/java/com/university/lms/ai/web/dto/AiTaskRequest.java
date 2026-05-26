package com.university.lms.ai.web.dto;

import com.university.lms.ai.domain.model.AiTaskType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record AiTaskRequest(
        @NotNull AiTaskType type,
        Map<String, Object> context,
        Map<String, Object> input
) {}
