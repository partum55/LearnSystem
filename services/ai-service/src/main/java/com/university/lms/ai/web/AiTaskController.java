package com.university.lms.ai.web;

import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.service.AiTaskService;
import com.university.lms.ai.web.dto.AiTaskRequest;
import com.university.lms.ai.web.dto.AiTaskResponse;
import jakarta.servlet.http.HttpServletRequest;
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
        String role = (String) httpRequest.getAttribute("role"); // Extract role if available in common filter
        
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
            // In a real app we might return 400/403/422 based on error code, but returning 200 with error structure is often fine for AI tasks if frontend expects it, or better return 400.
            // Let's return 400 for errors so frontend apiFetch catches it.
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
