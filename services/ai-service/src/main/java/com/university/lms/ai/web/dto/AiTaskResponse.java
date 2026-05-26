package com.university.lms.ai.web.dto;

import com.university.lms.ai.domain.model.AiGenerationStatus;
import com.university.lms.ai.domain.model.AiTaskType;

import java.util.UUID;

public record AiTaskResponse(
        UUID generationId,
        AiTaskType type,
        AiGenerationStatus status,
        Object output,
        String errorCode,
        String errorMessage
) {}
