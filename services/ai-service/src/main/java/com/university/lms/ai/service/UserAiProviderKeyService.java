package com.university.lms.ai.service;

import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.domain.AiProviderKeyStatus;
import com.university.lms.ai.domain.key.UserApiKey;
import com.university.lms.ai.repository.UserApiKeyRepository;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAiProviderKeyService {

    private static final Pattern GEMINI_API_KEY_PATTERN = Pattern.compile("^AIza[0-9A-Za-z_-]{20,100}$");

    private final UserApiKeyRepository userApiKeyRepository;
    private final AiKeyEncryptionService encryptionService;

    @Transactional
    public UserApiKey saveUserKey(UUID userId, AiProvider provider, String rawApiKey) {
        validateProvider(provider);
        String normalizedKey = normalizeAndValidateKey(rawApiKey);

        try {
            String encrypted = encryptionService.encrypt(normalizedKey);
            String prefix = normalizedKey.substring(0, Math.min(6, normalizedKey.length()));
            String last4 = normalizedKey.substring(Math.max(0, normalizedKey.length() - 4));

            UserApiKey entity = userApiKeyRepository
                    .findFirstByUserIdAndProviderAndStatus(userId, provider, AiProviderKeyStatus.ACTIVE)
                    .orElse(UserApiKey.builder()
                            .userId(userId)
                            .provider(provider)
                            .status(AiProviderKeyStatus.ACTIVE)
                            .build());

            entity.setEncryptedApiKey(encrypted);
            entity.setKeyPrefix(prefix);
            entity.setKeyLast4(last4);
            entity.setStatus(AiProviderKeyStatus.ACTIVE);

            return userApiKeyRepository.save(entity);
        } catch (AiSettingsException ex) {
            throw ex;
        } catch (Exception ex) {
            throw AiSettingsException.serverError("AI_KEY_SAVE_FAILED", "Failed to save AI API key");
        }
    }

    public boolean isValidFormat(AiProvider provider, String rawApiKey) {
        validateProvider(provider);
        String normalized = rawApiKey == null ? "" : rawApiKey.trim();
        return GEMINI_API_KEY_PATTERN.matcher(normalized).matches();
    }

    @Transactional
    public void revokeUserKey(UUID userId, AiProvider provider) {
        validateProvider(provider);
        try {
            userApiKeyRepository
                    .findFirstByUserIdAndProviderAndStatus(userId, provider, AiProviderKeyStatus.ACTIVE)
                    .ifPresent(key -> {
                        key.setStatus(AiProviderKeyStatus.REVOKED);
                        userApiKeyRepository.save(key);
                    });
        } catch (Exception ex) {
            throw AiSettingsException.serverError("AI_KEY_DELETE_FAILED", "Failed to delete AI API key");
        }
    }

    public UserApiKey findActiveUserKey(UUID userId, AiProvider provider) {
        validateProvider(provider);
        return userApiKeyRepository
                .findFirstByUserIdAndProviderAndStatus(userId, provider, AiProviderKeyStatus.ACTIVE)
                .orElse(null);
    }

    private String normalizeAndValidateKey(String rawApiKey) {
        String normalized = rawApiKey == null ? "" : rawApiKey.trim();
        if (!GEMINI_API_KEY_PATTERN.matcher(normalized).matches()) {
            throw AiSettingsException.badRequest(
                    "INVALID_API_KEY_FORMAT",
                    "Invalid Gemini API key format"
            );
        }
        return normalized;
    }

    private void validateProvider(AiProvider provider) {
        if (provider != AiProvider.GEMINI) {
            throw AiSettingsException.badRequest("INVALID_AI_PROVIDER", "Only Gemini is supported");
        }
    }
}
