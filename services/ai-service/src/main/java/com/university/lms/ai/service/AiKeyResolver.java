package com.university.lms.ai.service;

import com.university.lms.ai.domain.AiKeySource;
import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.domain.AiProviderKeyStatus;
import com.university.lms.ai.repository.UserApiKeyRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiKeyResolver {

    private final UserApiKeyRepository userApiKeyRepository;
    private final AiKeyEncryptionService encryptionService;
    private final AiProviderConfigService configService;

    @Transactional
    public AiKeyResolution resolve(UUID userId, String userRole) {
        AiProvider provider = configService.getDefaultProvider();

        if (!configService.isAiFeaturesEnabled()) {
            return new AiKeyResolution(false, provider, AiKeySource.NONE, null);
        }

        return userApiKeyRepository
                .findFirstByUserIdAndProviderAndStatus(userId, provider, AiProviderKeyStatus.ACTIVE)
                .map(key -> {
                    key.setLastUsedAt(LocalDateTime.now());
                    return new AiKeyResolution(
                            true,
                            provider,
                            AiKeySource.USER_KEY,
                            encryptionService.decrypt(key.getEncryptedApiKey())
                    );
                })
                .orElseGet(() -> resolveSystemKey(provider, userRole));
    }

    private AiKeyResolution resolveSystemKey(AiProvider provider, String userRole) {
        if (isAdmin(userRole) && provider == AiProvider.GEMINI && configService.hasSystemGeminiApiKey()) {
            return new AiKeyResolution(true, provider, AiKeySource.SYSTEM_KEY, configService.getSystemGeminiApiKey());
        }
        return new AiKeyResolution(true, provider, AiKeySource.NONE, null);
    }

    private boolean isAdmin(String userRole) {
        return "ADMIN".equalsIgnoreCase(userRole);
    }
}
