package com.university.lms.ai.service;

import com.university.lms.ai.domain.AiKeySource;
import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.domain.key.UserApiKey;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.dto.AiConnectionTestResponse;
import com.university.lms.ai.dto.AiSettingsResponse;
import com.university.lms.ai.dto.SaveAiApiKeyRequest;
import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.provider.GeminiProviderClient;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserAiSettingsService {

    private final UserAiProviderKeyService keyService;
    private final AiProviderConfigService configService;
    private final GeminiProviderClient geminiProviderClient;

    public AiSettingsResponse getSettings(UUID userId, String userRole) {
        AiProvider provider = configService.getDefaultProvider();
        UserApiKey userKey = keyService.findActiveUserKey(userId, provider);
        AiKeyResolution resolution = settingsResolution(provider, userRole, userKey);

        return toResponse(provider, userRole, userKey, resolution);
    }

    public AiKeyResolution resolveKey(UUID userId, String userRole) {
        AiProvider provider = configService.getDefaultProvider();
        UserApiKey userKey = keyService.findActiveUserKey(userId, provider);
        
        if (!configService.isAiFeaturesEnabled()) {
            return new AiKeyResolution(false, provider, AiKeySource.NONE, null);
        }
        
        if (userKey != null) {
            String rawKey = keyService.getRawApiKey(userKey);
            if (rawKey != null) {
                return new AiKeyResolution(true, provider, AiKeySource.USER_KEY, rawKey);
            }
        }
        
        if (isAdmin(userRole) && configService.hasSystemGeminiApiKey()) {
            // Need to make getSystemGeminiApiKey public in config service, but for now we can access it if it's package-private and we are in same package
            // Let's assume it's in same package.
            return new AiKeyResolution(true, provider, AiKeySource.SYSTEM_KEY, configService.getSystemGeminiApiKey());
        }
        
        return new AiKeyResolution(true, provider, AiKeySource.NONE, null);
    }

    public AiSettingsResponse saveApiKey(UUID userId, String userRole, SaveAiApiKeyRequest request) {
        keyService.saveUserKey(userId, request.provider(), request.apiKey());
        return getSettings(userId, userRole);
    }

    public AiSettingsResponse deleteApiKey(UUID userId, String userRole) {
        keyService.revokeUserKey(userId, configService.getDefaultProvider());
        return getSettings(userId, userRole);
    }

    public AiConnectionTestResponse testConnection(UUID userId, String userRole) {
        AiKeyResolution resolution = resolveKey(userId, userRole);
        if (!resolution.aiEnabled()) {
            throw new AiException(AiErrorCode.AI_KEY_REQUIRED, "AI features are disabled or no key is available");
        }
        if (resolution.keySource() == AiKeySource.NONE || resolution.apiKey() == null) {
            throw new AiException(AiErrorCode.AI_KEY_REQUIRED, "An active AI API key is required");
        }

        geminiProviderClient.testConnection(resolution.apiKey());
        return new AiConnectionTestResponse("OK", "Gemini connection OK.");
    }

    private AiSettingsResponse toResponse(
            AiProvider provider,
            String userRole,
            UserApiKey userKey,
            AiKeyResolution resolution
    ) {
        boolean hasUserKey = userKey != null;
        boolean adminSystemKeyAvailable = isAdmin(userRole) && configService.hasSystemGeminiApiKey();
        AiKeySource effectiveSource = resolution.aiEnabled() ? resolution.keySource() : AiKeySource.NONE;

        return new AiSettingsResponse(
                configService.isAiFeaturesEnabled(),
                provider,
                hasUserKey,
                hasUserKey ? "****" + userKey.getKeyLast4() : null,
                hasUserKey ? userKey.getStatus() : null,
                adminSystemKeyAvailable,
                provider,
                effectiveSource,
                hasUserKey ? userKey.getLastUsedAt() : null
        );
    }

    private boolean isAdmin(String userRole) {
        return "ADMIN".equalsIgnoreCase(userRole);
    }

    private AiKeyResolution settingsResolution(AiProvider provider, String userRole, UserApiKey userKey) {
        if (!configService.isAiFeaturesEnabled()) {
            return new AiKeyResolution(false, provider, AiKeySource.NONE, null);
        }
        if (userKey != null) {
            return new AiKeyResolution(true, provider, AiKeySource.USER_KEY, null);
        }
        if (isAdmin(userRole) && configService.hasSystemGeminiApiKey()) {
            return new AiKeyResolution(true, provider, AiKeySource.SYSTEM_KEY, null);
        }
        return new AiKeyResolution(true, provider, AiKeySource.NONE, null);
    }
}
