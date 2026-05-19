package com.university.lms.ai.web;

import com.university.lms.ai.dto.*;
import com.university.lms.ai.service.GradingSuggestionService;
import com.university.lms.ai.service.PlagiarismHintService;
import com.university.lms.ai.service.SyllabusGenerationService;
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
@PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
public class TeacherAiController {

    private final GradingSuggestionService gradingSuggestionService;
    private final PlagiarismHintService plagiarismHintService;
    private final SyllabusGenerationService syllabusGenerationService;

    @PostMapping("/grade-suggestion")
    public ResponseEntity<GradeSuggestionResponse> suggestGrade(
            @Valid @RequestBody GradeSuggestionRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String apiKey = (String) httpRequest.getAttribute("userApiKey");
        String authToken = httpRequest.getHeader("Authorization");

        log.info("Grade suggestion request from user {} for submission: {}", userId, request.getSubmissionId());
        GradeSuggestionResponse response = gradingSuggestionService.suggestGrade(
                request, apiKey, authToken, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/plagiarism-check")
    public ResponseEntity<PlagiarismCheckResponse> checkPlagiarism(
            @Valid @RequestBody PlagiarismCheckRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String apiKey = (String) httpRequest.getAttribute("userApiKey");
        String authToken = httpRequest.getHeader("Authorization");

        log.info("Plagiarism check request from user {} for submission: {}", userId, request.getSubmissionId());
        PlagiarismCheckResponse response = plagiarismHintService.checkPlagiarism(
                request, apiKey, authToken, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/syllabus")
    public ResponseEntity<SyllabusResponse> generateSyllabus(
            @Valid @RequestBody SyllabusRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = (UUID) httpRequest.getAttribute("userId");
        String apiKey = (String) httpRequest.getAttribute("userApiKey");

        log.info("Syllabus generation request from user {}", userId);
        SyllabusResponse response = syllabusGenerationService.generateSyllabus(request, apiKey, userId);
        return ResponseEntity.ok(response);
    }
}
