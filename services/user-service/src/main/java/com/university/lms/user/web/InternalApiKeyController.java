package com.university.lms.user.web;

import com.university.lms.user.service.UserApiKeyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal/api-keys")
@RequiredArgsConstructor
@Slf4j
public class InternalApiKeyController {

    private final UserApiKeyService apiKeyService;

    @GetMapping("/{userId}/{provider}")
    public ResponseEntity<Map<String, String>> getDecryptedApiKey(
            @PathVariable UUID userId,
            @PathVariable String provider) {
        String key = apiKeyService.getDecryptedApiKey(userId, provider.toUpperCase());
        if (key == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("apiKey", key));
    }
}
