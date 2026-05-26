package com.university.lms.ai.service;

import com.university.lms.ai.domain.AiKeySource;
import com.university.lms.ai.domain.AiProvider;

public record AiKeyResolution(
        boolean aiEnabled,
        AiProvider provider,
        AiKeySource keySource,
        String apiKey
) {
    public boolean hasUsableKey() {
        return aiEnabled && keySource != AiKeySource.NONE && apiKey != null && !apiKey.isBlank();
    }
}
