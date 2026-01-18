package com.university.lms.assessment.web;

import com.university.lms.assessment.dto.CodeExecutionRequest;
import com.university.lms.assessment.dto.CodeExecutionResult;
import com.university.lms.assessment.service.VirtualLabService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final HttpServletRequest request;

    /**
     * Execute code for a virtual lab assignment.
     */
    @PostMapping("/execute")
    public ResponseEntity<CodeExecutionResult> executeCode(
            @Valid @RequestBody CodeExecutionRequest request,
            Authentication authentication) {
        
        UUID userId = extractUserId(authentication);
        log.info("Code execution request from user: {}", userId);
        
        CodeExecutionResult result = virtualLabService.executeCode(request, userId);
        return ResponseEntity.ok(result);
    }

    /**
     * Extract user ID from authentication.
     */
    private UUID extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        Object userId = request.getAttribute("userId");
        if (userId instanceof UUID) {
            return (UUID) userId;
        }
        return null;
    }
}
