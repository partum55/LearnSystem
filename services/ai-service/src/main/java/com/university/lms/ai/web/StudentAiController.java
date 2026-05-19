package com.university.lms.ai.web;

import com.university.lms.ai.dto.*;
import com.university.lms.ai.service.ExplainService;
import com.university.lms.ai.service.PracticeQuizService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class StudentAiController {

    private final ExplainService explainService;
    private final PracticeQuizService practiceQuizService;

    @PostMapping("/explain")
    public ResponseEntity<ExplainResponse> explain(
            @Valid @RequestBody ExplainRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String apiKey = (String) httpRequest.getAttribute("userApiKey");

        log.info("Explain request from user {} for content type: {}", userId, request.getContentType());
        ExplainResponse response = explainService.explain(request, apiKey, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/practice-quiz")
    public ResponseEntity<PracticeQuizResponse> generatePracticeQuiz(
            @Valid @RequestBody PracticeQuizRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String apiKey = (String) httpRequest.getAttribute("userApiKey");
        String authToken = httpRequest.getHeader("Authorization");

        log.info("Practice quiz request from user {} for course: {}", userId, request.getCourseId());
        PracticeQuizResponse response = practiceQuizService.generatePracticeQuiz(
                request, apiKey, authToken, userId);
        return ResponseEntity.ok(response);
    }
}
