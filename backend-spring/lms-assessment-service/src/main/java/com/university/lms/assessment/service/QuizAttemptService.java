package com.university.lms.assessment.service;

import com.university.lms.assessment.domain.Quiz;
import com.university.lms.assessment.domain.QuizAttempt;
import com.university.lms.assessment.repository.QuizAttemptRepository;
import com.university.lms.assessment.repository.QuizRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for managing quiz attempts.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizAttemptService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizRepository quizRepository;

    /**
     * Start a new quiz attempt.
     */
    @Transactional
    public QuizAttempt startQuizAttempt(UUID quizId, UUID userId, String ipAddress, String browserFingerprint) {
        log.info("Starting quiz attempt for user {} on quiz {}", userId, quizId);

        Quiz quiz = findQuizById(quizId);

        // Check if there's an in-progress attempt
        quizAttemptRepository.findInProgressAttempt(quizId, userId)
            .ifPresent(attempt -> {
                throw new ValidationException("You already have an in-progress attempt for this quiz");
            });

        // Check attempts limit
        long attemptCount = quizAttemptRepository.countByQuizIdAndUserId(quizId, userId);
        if (attemptCount >= quiz.getAttemptsAllowed()) {
            throw new ValidationException("You have reached the maximum number of attempts for this quiz");
        }

        int attemptNumber = (int) attemptCount + 1;

        QuizAttempt attempt = QuizAttempt.builder()
            .quiz(quiz)
            .userId(userId)
            .attemptNumber(attemptNumber)
            .ipAddress(ipAddress)
            .browserFingerprint(browserFingerprint)
            .build();

        QuizAttempt savedAttempt = quizAttemptRepository.save(attempt);
        log.info("Quiz attempt started successfully with ID: {}", savedAttempt.getId());

        return savedAttempt;
    }

    /**
     * Submit quiz attempt.
     */
    @Transactional
    public QuizAttempt submitQuizAttempt(UUID attemptId, Map<String, Object> answers, UUID userId) {
        log.info("Submitting quiz attempt: {}", attemptId);

        QuizAttempt attempt = findAttemptById(attemptId);

        // Verify ownership
        if (!attempt.getUserId().equals(userId)) {
            throw new ValidationException("You don't have permission to submit this attempt");
        }

        // Check if already submitted
        if (attempt.isSubmitted()) {
            throw new ValidationException("This attempt has already been submitted");
        }

        // Check time limit
        Quiz quiz = attempt.getQuiz();
        if (quiz.getTimeLimit() != null) {
            long minutesElapsed = java.time.Duration.between(attempt.getStartedAt(), LocalDateTime.now()).toMinutes();
            if (minutesElapsed > quiz.getTimeLimit()) {
                log.warn("Time limit exceeded for attempt: {}", attemptId);
            }
        }

        attempt.setAnswers(answers);
        attempt.setSubmittedAt(LocalDateTime.now());

        // Auto-grade if possible
        BigDecimal autoScore = calculateAutoScore(attempt);
        if (autoScore != null) {
            attempt.setAutoScore(autoScore);
            attempt.setFinalScore(autoScore);
        }

        QuizAttempt submittedAttempt = quizAttemptRepository.save(attempt);
        log.info("Quiz attempt submitted successfully: {}", attemptId);

        return submittedAttempt;
    }

    /**
     * Grade quiz attempt manually.
     */
    @Transactional
    public QuizAttempt gradeQuizAttempt(UUID attemptId, BigDecimal manualScore, String feedback, UUID gradedBy) {
        log.info("Grading quiz attempt: {} by user: {}", attemptId, gradedBy);

        QuizAttempt attempt = findAttemptById(attemptId);

        // Check if submitted
        if (!attempt.isSubmitted()) {
            throw new ValidationException("Cannot grade an unsubmitted attempt");
        }

        attempt.setManualScore(manualScore);
        attempt.setFeedback(feedback);
        attempt.setGradedBy(gradedBy);
        attempt.setGradedAt(LocalDateTime.now());

        // Final score is manual score if provided, otherwise auto score
        attempt.setFinalScore(manualScore != null ? manualScore : attempt.getAutoScore());

        QuizAttempt gradedAttempt = quizAttemptRepository.save(attempt);
        log.info("Quiz attempt graded successfully: {}", attemptId);

        return gradedAttempt;
    }

    /**
     * Get user's attempts for a quiz.
     */
    public List<QuizAttempt> getUserAttempts(UUID quizId, UUID userId) {
        log.debug("Fetching attempts for user {} on quiz {}", userId, quizId);
        return quizAttemptRepository.findByQuizIdAndUserIdOrderByAttemptNumberAsc(quizId, userId);
    }

    /**
     * Get latest attempt.
     */
    public QuizAttempt getLatestAttempt(UUID quizId, UUID userId) {
        log.debug("Fetching latest attempt for user {} on quiz {}", userId, quizId);
        return quizAttemptRepository.findLatestAttempt(quizId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("No attempts found for this quiz"));
    }

    /**
     * Get in-progress attempt.
     */
    public QuizAttempt getInProgressAttempt(UUID quizId, UUID userId) {
        log.debug("Fetching in-progress attempt for user {} on quiz {}", userId, quizId);
        return quizAttemptRepository.findInProgressAttempt(quizId, userId)
            .orElse(null);
    }

    /**
     * Get ungraded attempts for a quiz.
     */
    public List<QuizAttempt> getUngradedAttempts(UUID quizId) {
        log.debug("Fetching ungraded attempts for quiz: {}", quizId);
        return quizAttemptRepository.findUngradedAttempts(quizId);
    }

    /**
     * Calculate auto score for objective questions.
     */
    private BigDecimal calculateAutoScore(QuizAttempt attempt) {
        // TODO: Implement auto-grading logic for objective questions
        // For now, return null to indicate manual grading needed
        return null;
    }

    // Helper methods

    private Quiz findQuizById(UUID id) {
        return quizRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", id));
    }

    private QuizAttempt findAttemptById(UUID id) {
        return quizAttemptRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("QuizAttempt", "id", id));
    }
}

