package com.university.lms.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import javax.crypto.KeyGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApiKeyEncryptionServiceTest {

  private ApiKeyEncryptionService service;

  @BeforeEach
  void setUp() throws Exception {
    KeyGenerator keyGen = KeyGenerator.getInstance("AES");
    keyGen.init(256);
    String base64Key = Base64.getEncoder().encodeToString(keyGen.generateKey().getEncoded());
    service = new ApiKeyEncryptionService(base64Key);
  }

  @Test
  void encrypt_thenDecrypt_roundTrip() {
    String plaintext = "sk-test-api-key-12345";

    String encrypted = service.encrypt(plaintext);
    String decrypted = service.decrypt(encrypted);

    assertThat(decrypted).isEqualTo(plaintext);
  }

  @Test
  void encrypt_producesUniqueCiphertexts() {
    String plaintext = "sk-same-key";

    String first = service.encrypt(plaintext);
    String second = service.encrypt(plaintext);

    assertThat(first).isNotEqualTo(second);
    assertThat(service.decrypt(first)).isEqualTo(plaintext);
    assertThat(service.decrypt(second)).isEqualTo(plaintext);
  }

  @Test
  void decrypt_tamperedCiphertext_throws() {
    String encrypted = service.encrypt("sk-test-key");
    byte[] decoded = Base64.getDecoder().decode(encrypted);
    decoded[decoded.length - 1] ^= 0xFF;
    String tampered = Base64.getEncoder().encodeToString(decoded);

    assertThatThrownBy(() -> service.decrypt(tampered))
        .isInstanceOf(RuntimeException.class);
  }
}
