package com.university.lms.ai.service;

import com.university.lms.ai.domain.AiProvider;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiProviderConfigService {

    private final boolean aiFeaturesEnabled;
    private final AiProvider defaultProvider;
    private final String systemGeminiApiKey;
    private final String geminiModel;

    public AiProviderConfigService(
            @Value("${ai.features.enabled:false}") boolean aiFeaturesEnabled,
            @Value("${ai.default-provider:GEMINI}") String defaultProvider,
            @Value("${ai.system-gemini-api-key:}") String systemGeminiApiKey,
            @Value("${ai.gemini-model:gemini-3.5-flash}") String geminiModel
    ) {
        this.aiFeaturesEnabled = aiFeaturesEnabled;
        this.defaultProvider = AiProvider.valueOf(defaultProvider.trim().toUpperCase(Locale.ROOT));
        this.systemGeminiApiKey = normalize(systemGeminiApiKey);
        this.geminiModel = normalize(geminiModel);
    }

    public boolean isAiFeaturesEnabled() {
        return aiFeaturesEnabled;
    }

    public AiProvider getDefaultProvider() {
        return defaultProvider;
    }

    public boolean hasSystemGeminiApiKey() {
        return systemGeminiApiKey != null;
    }

    String getSystemGeminiApiKey() {
        return systemGeminiApiKey;
    }

    public String getGeminiModel() {
        return geminiModel;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
