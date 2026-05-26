package com.university.lms.ai.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class AiKeyEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final String encryptionSecret;
    private final SecureRandom secureRandom = new SecureRandom();

    public AiKeyEncryptionService(@Value("${ai.key-encryption-secret:}") String encryptionSecret) {
        this.encryptionSecret = encryptionSecret == null ? "" : encryptionSecret.trim();
    }

    public boolean isConfigured() {
        return !encryptionSecret.isBlank();
    }

    public String encrypt(String plaintext) {
        ensureConfigured();
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(IV_LENGTH + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception ex) {
            log.error("AI key encryption failed", ex);
            throw AiSettingsException.serverError("AI_KEY_SAVE_FAILED", "Failed to save AI API key");
        }
    }

    public String decrypt(String encrypted) {
        ensureConfigured();
        try {
            byte[] decoded = Base64.getDecoder().decode(encrypted);
            ByteBuffer buffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            log.error("AI key decryption failed", ex);
            throw AiSettingsException.serverError("AI_KEY_REQUIRED", "AI key could not be resolved");
        }
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw AiSettingsException.serverError(
                    "AI_KEY_STORAGE_NOT_CONFIGURED",
                    "AI key storage is not configured"
            );
        }
    }

    private SecretKeySpec keySpec() throws Exception {
        byte[] keyBytes = decodeBase64Key();
        if (keyBytes == null) {
            keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(encryptionSecret.getBytes(StandardCharsets.UTF_8));
        }
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException("AI encryption key must resolve to 32 bytes");
        }
        return new SecretKeySpec(keyBytes, "AES");
    }

    private byte[] decodeBase64Key() {
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptionSecret);
            return decoded.length == 32 ? decoded : null;
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
