package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.CodeExecutionRequest;
import com.university.lms.course.assessment.dto.CodeExecutionResult;
import com.university.lms.course.assessment.service.VirtualLabService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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
    private final RequestUserContext requestUserContext;

    /**
     * Execute code for a virtual lab assignment.
     */
    @PostMapping("/execute")
    public ResponseEntity<CodeExecutionResult> executeCode(@Valid @RequestBody CodeExecutionRequest executionRequest) {
        UUID userId = requestUserContext.requireUserId();
        log.info("Code execution request from user: {}", userId);

        CodeExecutionResult result = virtualLabService.executeCode(executionRequest, userId);
        return ResponseEntity.ok(result);
    }
}
