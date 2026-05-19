package com.university.lms.user.service;

import com.university.lms.user.domain.UserApiKey;
import com.university.lms.user.dto.ApiKeyDto;
import com.university.lms.user.repository.UserApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserApiKeyService {

    private final UserApiKeyRepository apiKeyRepository;
    private final ApiKeyEncryptionService encryptionService;

    @Transactional
    public ApiKeyDto saveApiKey(UUID userId, String provider, String rawKey) {
        String encrypted = encryptionService.encrypt(rawKey);
        String hint = rawKey.length() >= 4 ? rawKey.substring(rawKey.length() - 4) : rawKey;

        UserApiKey apiKey = apiKeyRepository.findByUserIdAndProviderAndIsActiveTrue(userId, provider)
                .map(existing -> {
                    existing.setEncryptedKey(encrypted);
                    existing.setKeyHint(hint);
                    return existing;
                })
                .orElse(UserApiKey.builder()
                        .userId(userId)
                        .provider(provider.toUpperCase())
                        .encryptedKey(encrypted)
                        .keyHint(hint)
                        .isActive(true)
                        .build());

        UserApiKey saved = apiKeyRepository.save(apiKey);
        log.info("API key saved for user {} provider {}", userId, provider);
        return toDto(saved);
    }

    public List<ApiKeyDto> getApiKeysMasked(UUID userId) {
        return apiKeyRepository.findByUserIdAndIsActiveTrue(userId).stream()
                .map(this::toDto)
                .toList();
    }

    public String getDecryptedApiKey(UUID userId, String provider) {
        return apiKeyRepository.findByUserIdAndProviderAndIsActiveTrue(userId, provider)
                .map(key -> encryptionService.decrypt(key.getEncryptedKey()))
                .orElse(null);
    }

    @Transactional
    public void deleteApiKey(UUID userId, String provider) {
        apiKeyRepository.deleteByUserIdAndProvider(userId, provider.toUpperCase());
        log.info("API key deleted for user {} provider {}", userId, provider);
    }

    public boolean hasApiKey(UUID userId, String provider) {
        return apiKeyRepository.findByUserIdAndProviderAndIsActiveTrue(userId, provider).isPresent();
    }

    public boolean validateApiKey(String rawKey) {
        try {
            RestClient client = RestClient.create("https://api.groq.com/openai/v1");
            String response = client.get()
                    .uri("/models")
                    .header("Authorization", "Bearer " + rawKey)
                    .retrieve()
                    .body(String.class);
            return response != null;
        } catch (Exception e) {
            log.warn("API key validation failed: {}", e.getMessage());
            return false;
        }
    }

    private ApiKeyDto toDto(UserApiKey entity) {
        return ApiKeyDto.builder()
                .id(entity.getId())
                .provider(entity.getProvider())
                .keyHint(entity.getKeyHint())
                .isActive(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
