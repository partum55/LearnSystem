package com.university.lms.ai.web;

import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.dto.AiApiKeyValidationResponse;
import com.university.lms.ai.dto.AiConnectionTestResponse;
import com.university.lms.ai.dto.AiSettingsResponse;
import com.university.lms.ai.dto.SaveAiApiKeyRequest;
import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.service.UserAiProviderKeyService;
import com.university.lms.ai.service.UserAiSettingsService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/users/me/ai-settings")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserAiSettingsController {

    private final UserAiSettingsService settingsService;
    private final UserAiProviderKeyService keyService;

    @GetMapping
    public ResponseEntity<AiSettingsResponse> getSettings(
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole
    ) {
        return ResponseEntity.ok(settingsService.getSettings(userId, userRole));
    }

    @PutMapping("/api-key")
    public ResponseEntity<AiSettingsResponse> saveApiKey(
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole,
            @Valid @RequestBody SaveAiApiKeyRequest request
    ) {
        return ResponseEntity.ok(settingsService.saveApiKey(userId, userRole, request));
    }

    @DeleteMapping("/api-key")
    public ResponseEntity<AiSettingsResponse> deleteApiKey(
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole
    ) {
        return ResponseEntity.ok(settingsService.deleteApiKey(userId, userRole));
    }

    @PostMapping("/api-key/validate")
    public ResponseEntity<AiApiKeyValidationResponse> validateApiKey(
            @Valid @RequestBody SaveAiApiKeyRequest request
    ) {
        boolean valid = keyService.isValidFormat(
                request.provider() == null ? AiProvider.GEMINI : request.provider(),
                request.apiKey()
        );
        return ResponseEntity.ok(new AiApiKeyValidationResponse(valid));
    }

    @PostMapping("/test-connection")
    public ResponseEntity<AiConnectionTestResponse> testConnection(
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole
    ) {
        try {
            return ResponseEntity.ok(settingsService.testConnection(userId, userRole));
        } catch (AiException e) {
            return ResponseEntity.status(statusFor(e))
                    .body(new AiConnectionTestResponse(e.getErrorCode().name(), e.getMessage()));
        }
    }

    private HttpStatus statusFor(AiException exception) {
        return switch (exception.getErrorCode()) {
            case AI_KEY_REQUIRED, AI_FEATURES_DISABLED, AI_PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case AI_PROVIDER_AUTH_FAILED -> HttpStatus.UNAUTHORIZED;
            case AI_PROVIDER_RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
            case AI_PROVIDER_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case AI_OUTPUT_INVALID -> HttpStatus.UNPROCESSABLE_ENTITY;
            case AI_TASK_FAILED -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}
