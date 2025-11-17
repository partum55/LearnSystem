package com.university.lms.assessment.web;

import com.university.lms.assessment.dto.CodeExecutionRequest;
import com.university.lms.assessment.dto.CodeExecutionResult;
import com.university.lms.assessment.service.VirtualLabService;
import com.university.lms.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for Virtual Programming Lab operations.
 */
@RestController
@RequestMapping("/virtual-lab")
@RequiredArgsConstructor
@Slf4j
public class VirtualLabController {

    private final VirtualLabService virtualLabService;

    /**
     * Execute code for a virtual lab assignment.
     */
    @PostMapping("/execute")
    public ResponseEntity<CodeExecutionResult> executeCode(
            @Valid @RequestBody CodeExecutionRequest request,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        log.info("Code execution request from user: {}", userId);
        
        CodeExecutionResult result = virtualLabService.executeCode(request, userId);
        return ResponseEntity.ok(result);
    }

    /**
     * Get current user ID from authentication.
     */
    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof CurrentUser) {
            return ((CurrentUser) authentication.getPrincipal()).getId();
        }
        // For testing purposes, return a dummy UUID if not authenticated
        return UUID.randomUUID();
    }
}
