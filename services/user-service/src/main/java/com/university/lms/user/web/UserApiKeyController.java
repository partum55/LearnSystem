package com.university.lms.user.web;

import com.university.lms.user.dto.ApiKeyDto;
import com.university.lms.user.dto.CreateApiKeyRequest;
import com.university.lms.user.service.UserApiKeyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/users/me/api-keys")
@RequiredArgsConstructor
@Slf4j
public class UserApiKeyController {

    private final UserApiKeyService apiKeyService;

    @PostMapping
    public ResponseEntity<ApiKeyDto> saveApiKey(
            @Valid @RequestBody CreateApiKeyRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        ApiKeyDto saved = apiKeyService.saveApiKey(userId, request.getProvider(), request.getApiKey());
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<ApiKeyDto>> getApiKeys(HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        return ResponseEntity.ok(apiKeyService.getApiKeysMasked(userId));
    }

    @DeleteMapping("/{provider}")
    public ResponseEntity<Void> deleteApiKey(
            @PathVariable String provider,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        apiKeyService.deleteApiKey(userId, provider);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Boolean>> validateApiKey(
            @Valid @RequestBody CreateApiKeyRequest request) {
        boolean valid = apiKeyService.validateApiKey(request.getApiKey());
        return ResponseEntity.ok(Map.of("valid", valid));
    }
}
