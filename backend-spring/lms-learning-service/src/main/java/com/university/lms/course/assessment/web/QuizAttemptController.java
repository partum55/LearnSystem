package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.domain.QuizAttempt;
import com.university.lms.course.assessment.dto.QuizAttemptDto;
import com.university.lms.course.assessment.dto.QuizAttemptQuestionDto;
import com.university.lms.course.assessment.dto.QuizAttemptResultDto;
import com.university.lms.course.assessment.service.QuizAttemptService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
public class QuizAttemptController {

    private final QuizAttemptService quizAttemptService;
    private final RequestUserContext requestUserContext;

    /**
     * Start a new quiz attempt.
     */
    @PostMapping("/quiz/{quizId}/start")
    public ResponseEntity<QuizAttempt> startQuizAttempt(
            @PathVariable UUID quizId,
            HttpServletRequest request) {

        UUID userId = requestUserContext.requireUserId();
        String ipAddress = request.getRemoteAddr();
        String browserFingerprint = request.getHeader("User-Agent");

        QuizAttempt attempt = quizAttemptService.startQuizAttempt(quizId, userId, ipAddress, browserFingerprint);
        return ResponseEntity.status(HttpStatus.CREATED).body(attempt);
    }

    /**
     * Save in-progress answers without submitting attempt.
     */
    @PostMapping("/{attemptId}/save")
    public ResponseEntity<QuizAttempt> saveQuizAttemptProgress(
            @PathVariable UUID attemptId,
            @RequestBody Map<String, Object> answers) {

        UUID userId = requestUserContext.requireUserId();
        QuizAttempt attempt = quizAttemptService.saveProgress(attemptId, answers, userId);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Submit quiz attempt.
     */
    @PostMapping("/{attemptId}/submit")
    public ResponseEntity<QuizAttempt> submitQuizAttempt(
            @PathVariable UUID attemptId,
            @RequestBody Map<String, Object> answers) {

        UUID userId = requestUserContext.requireUserId();
        QuizAttempt attempt = quizAttemptService.submitQuizAttempt(attemptId, answers, userId);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Get frozen question snapshots for an attempt.
     */
    @GetMapping("/{attemptId}")
    public ResponseEntity<QuizAttemptDto> getAttempt(@PathVariable UUID attemptId) {
        UUID userId = requestUserContext.requireUserId();
        String userRole = requestUserContext.requireUserRole();
        return ResponseEntity.ok(quizAttemptService.getAttemptById(attemptId, userId, userRole));
    }

    /**
     * Get grading results for an attempt.
     */
    @GetMapping("/{attemptId}/results")
    public ResponseEntity<QuizAttemptResultDto> getAttemptResults(@PathVariable UUID attemptId) {
        UUID userId = requestUserContext.requireUserId();
        String userRole = requestUserContext.requireUserRole();
        return ResponseEntity.ok(quizAttemptService.getAttemptResults(attemptId, userId, userRole));
    }

    /**
     * Get frozen question snapshots for an attempt.
     */
    @GetMapping("/{attemptId}/questions")
    public ResponseEntity<List<QuizAttemptQuestionDto>> getAttemptQuestions(@PathVariable UUID attemptId) {
        UUID userId = requestUserContext.requireUserId();
        String userRole = requestUserContext.requireUserRole();
        return ResponseEntity.ok(quizAttemptService.getAttemptQuestions(attemptId, userId, userRole));
    }

    /**
     * Grade quiz attempt.
     */
    @PostMapping("/{attemptId}/grade")
    @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
    public ResponseEntity<QuizAttempt> gradeQuizAttempt(
            @PathVariable UUID attemptId,
            @RequestParam BigDecimal score,
            @RequestParam(required = false) String feedback) {

        UUID gradedBy = requestUserContext.requireUserId();
        QuizAttempt attempt = quizAttemptService.gradeQuizAttempt(attemptId, score, feedback, gradedBy);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Get user's attempts for a quiz.
     */
    @GetMapping("/quiz/{quizId}/user")
    public ResponseEntity<List<QuizAttempt>> getUserAttempts(
            @PathVariable UUID quizId) {

        UUID userId = requestUserContext.requireUserId();
        List<QuizAttempt> attempts = quizAttemptService.getUserAttempts(quizId, userId);
        return ResponseEntity.ok(attempts);
    }

    /**
     * Get latest attempt.
     */
    @GetMapping("/quiz/{quizId}/user/latest")
    public ResponseEntity<QuizAttempt> getLatestAttempt(
            @PathVariable UUID quizId) {

        UUID userId = requestUserContext.requireUserId();
        QuizAttempt attempt = quizAttemptService.getLatestAttempt(quizId, userId);
        return ResponseEntity.ok(attempt);
    }

    /**
     * Get in-progress attempt.
     */
    @GetMapping("/quiz/{quizId}/user/in-progress")
    public ResponseEntity<QuizAttempt> getInProgressAttempt(
            @PathVariable UUID quizId) {

        UUID userId = requestUserContext.requireUserId();
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
    @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
    public ResponseEntity<List<QuizAttempt>> getUngradedAttempts(@PathVariable UUID quizId) {
        List<QuizAttempt> attempts = quizAttemptService.getUngradedAttempts(quizId);
        return ResponseEntity.ok(attempts);
    }
}
