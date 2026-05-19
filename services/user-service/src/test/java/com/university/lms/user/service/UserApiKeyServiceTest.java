package com.university.lms.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.user.domain.UserApiKey;
import com.university.lms.user.dto.ApiKeyDto;
import com.university.lms.user.repository.UserApiKeyRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserApiKeyServiceTest {

  @Mock private UserApiKeyRepository apiKeyRepository;
  @Mock private ApiKeyEncryptionService encryptionService;

  @InjectMocks private UserApiKeyService service;

  @Test
  void saveApiKey_createsNewKey() {
    UUID userId = UUID.randomUUID();
    String provider = "GROQ";
    String rawKey = "sk-test-1234";

    when(encryptionService.encrypt(rawKey)).thenReturn("encrypted-value");
    when(apiKeyRepository.findByUserIdAndProviderAndIsActiveTrue(userId, provider))
        .thenReturn(Optional.empty());
    when(apiKeyRepository.save(any(UserApiKey.class))).thenAnswer(inv -> {
      UserApiKey key = inv.getArgument(0);
      key.setId(UUID.randomUUID());
      return key;
    });

    ApiKeyDto result = service.saveApiKey(userId, provider, rawKey);

    assertThat(result).isNotNull();
    assertThat(result.getProvider()).isEqualTo("GROQ");
    assertThat(result.getKeyHint()).isEqualTo("1234");
  }

  @Test
  void getDecryptedApiKey_returnsDecryptedValue() {
    UUID userId = UUID.randomUUID();
    String provider = "GROQ";

    UserApiKey apiKey = UserApiKey.builder()
        .id(UUID.randomUUID())
        .userId(userId)
        .provider(provider)
        .encryptedKey("encrypted-value")
        .isActive(true)
        .build();

    when(apiKeyRepository.findByUserIdAndProviderAndIsActiveTrue(userId, provider))
        .thenReturn(Optional.of(apiKey));
    when(encryptionService.decrypt("encrypted-value")).thenReturn("sk-decrypted");

    String result = service.getDecryptedApiKey(userId, provider);

    assertThat(result).isEqualTo("sk-decrypted");
  }

  @Test
  void deleteApiKey_deletesKey() {
    UUID userId = UUID.randomUUID();
    String provider = "groq";

    service.deleteApiKey(userId, provider);

    verify(apiKeyRepository).deleteByUserIdAndProvider(userId, "GROQ");
  }

  @Test
  void getDecryptedApiKey_notFound_returnsNull() {
    UUID userId = UUID.randomUUID();
    when(apiKeyRepository.findByUserIdAndProviderAndIsActiveTrue(userId, "GROQ"))
        .thenReturn(Optional.empty());

    String result = service.getDecryptedApiKey(userId, "GROQ");

    assertThat(result).isNull();
  }
}
