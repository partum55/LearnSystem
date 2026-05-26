package com.university.lms.ai.dto;

import com.university.lms.ai.domain.AiProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SaveAiApiKeyRequest(
        @NotNull AiProvider provider,
        @NotBlank String apiKey
) {
}
