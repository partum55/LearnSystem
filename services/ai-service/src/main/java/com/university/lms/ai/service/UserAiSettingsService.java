package com.university.lms.ai.service;

import com.university.lms.ai.domain.AiKeySource;
import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.domain.key.UserApiKey;
import com.university.lms.ai.dto.AiSettingsResponse;
import com.university.lms.ai.dto.SaveAiApiKeyRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserAiSettingsService {

    private final UserAiProviderKeyService keyService;
    private final AiProviderConfigService configService;

    public AiSettingsResponse getSettings(UUID userId, String userRole) {
        AiProvider provider = configService.getDefaultProvider();
        UserApiKey userKey = keyService.findActiveUserKey(userId, provider);
        AiKeyResolution resolution = settingsResolution(provider, userRole, userKey);

        return toResponse(provider, userRole, userKey, resolution);
    }

    public AiSettingsResponse saveApiKey(UUID userId, String userRole, SaveAiApiKeyRequest request) {
        keyService.saveUserKey(userId, request.provider(), request.apiKey());
        return getSettings(userId, userRole);
    }

    public AiSettingsResponse deleteApiKey(UUID userId, String userRole) {
        keyService.revokeUserKey(userId, configService.getDefaultProvider());
        return getSettings(userId, userRole);
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
