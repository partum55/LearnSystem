package com.university.lms.assessment.web;

import com.university.lms.assessment.domain.QuizAttempt;
import com.university.lms.assessment.service.QuizAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for quiz attempt management.
 */
@RestController
@RequestMapping("/quiz-attempts")
@RequiredArgsConstructor
@Slf4j
public class QuizAttemptController {

    private final QuizAttemptService quizAttemptService;

    /**
     * Start a new quiz attempt.
     */
    @PostMapping("/quiz/{quizId}/start")
    public ResponseEntity<QuizAttempt> startQuizAttempt(
            @PathVariable UUID quizId,
            Authentication authentication,
            HttpServletRequest request) {

        UUID userId = extractUserId(authentication);
        String ipAddress = request.getRemoteAddr();
        String browserFingerprint = request.getHeader("User-Agent");

        QuizAttempt attempt = quizAttemptService.startQuizAttempt(quizId, userId, ipAddress, browserFingerprint);
        return ResponseEntity.status(HttpStatus.CREATED).body(attempt);
    }

    /**
     * Submit quiz attempt.
     */
    @PostMapping("/{attemptId}/submit")
    public ResponseEntity<QuizAttempt> submitQuizAttempt(
            @PathVariable UUID attemptId,
            @RequestBody Map<String, Object> answers,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        QuizAttempt attempt = quizAttemptService.submitQuizAttempt(attemptId, answers, userId);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Grade quiz attempt.
     */
    @PostMapping("/{attemptId}/grade")
    public ResponseEntity<QuizAttempt> gradeQuizAttempt(
            @PathVariable UUID attemptId,
            @RequestParam BigDecimal score,
            @RequestParam(required = false) String feedback,
            Authentication authentication) {

        UUID gradedBy = extractUserId(authentication);
        QuizAttempt attempt = quizAttemptService.gradeQuizAttempt(attemptId, score, feedback, gradedBy);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Get user's attempts for a quiz.
     */
    @GetMapping("/quiz/{quizId}/user")
    public ResponseEntity<List<QuizAttempt>> getUserAttempts(
            @PathVariable UUID quizId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        List<QuizAttempt> attempts = quizAttemptService.getUserAttempts(quizId, userId);
        return ResponseEntity.ok(attempts);
    }

    /**
     * Get latest attempt.
     */
    @GetMapping("/quiz/{quizId}/user/latest")
    public ResponseEntity<QuizAttempt> getLatestAttempt(
            @PathVariable UUID quizId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        QuizAttempt attempt = quizAttemptService.getLatestAttempt(quizId, userId);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Get in-progress attempt.
     */
    @GetMapping("/quiz/{quizId}/user/in-progress")
    public ResponseEntity<QuizAttempt> getInProgressAttempt(
            @PathVariable UUID quizId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        QuizAttempt attempt = quizAttemptService.getInProgressAttempt(quizId, userId);

        if (attempt == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(attempt);
    }

    /**
     * Get ungraded attempts for a quiz (instructors only).
     */
    @GetMapping("/quiz/{quizId}/ungraded")
    public ResponseEntity<List<QuizAttempt>> getUngradedAttempts(@PathVariable UUID quizId) {
        List<QuizAttempt> attempts = quizAttemptService.getUngradedAttempts(quizId);
        return ResponseEntity.ok(attempts);
    }

    // Helper method
    private UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() != null) {
            return UUID.fromString(authentication.getName());
        }
        throw new RuntimeException("User not authenticated");
    }
}

