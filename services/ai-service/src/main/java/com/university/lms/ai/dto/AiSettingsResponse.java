package com.university.lms.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.university.lms.ai.domain.AiKeySource;
import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.domain.AiProviderKeyStatus;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiSettingsResponse(
        boolean aiEnabled,
        AiProvider provider,
        boolean hasUserApiKey,
        String maskedKey,
        AiProviderKeyStatus userKeyStatus,
        boolean hasSystemKeyAvailableForAdmin,
        AiProvider effectiveProvider,
        AiKeySource effectiveKeySource,
        LocalDateTime lastUsedAt
) {
}
