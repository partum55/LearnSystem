package com.university.lms.ai.web;

import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.service.AiTaskService;
import com.university.lms.ai.web.dto.AiTaskRequest;
import com.university.lms.ai.web.dto.AiTaskResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/ai")
public class AiTaskController {

    private final AiTaskService aiTaskService;

    public AiTaskController(AiTaskService aiTaskService) {
        this.aiTaskService = aiTaskService;
    }

    @PostMapping("/tasks")
    public ResponseEntity<AiTaskResponse> executeTask(
            @RequestBody AiTaskRequest request,
            HttpServletRequest httpRequest
    ) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String role = (String) httpRequest.getAttribute("userRole");
        
        try {
            AiTaskResponse response = aiTaskService.executeTask(request, userId, role);
            return ResponseEntity.ok(response);
        } catch (AiException e) {
            AiTaskResponse errorResponse = new AiTaskResponse(
                    null,
                    request.type(),
                    com.university.lms.ai.domain.model.AiGenerationStatus.FAILED,
                    null,
                    e.getErrorCode().name(),
                    e.getMessage()
            );
            return ResponseEntity.status(statusFor(e)).body(errorResponse);
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
