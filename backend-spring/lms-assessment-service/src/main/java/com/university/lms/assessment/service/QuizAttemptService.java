package com.university.lms.assessment.service;

import com.university.lms.assessment.domain.Quiz;
import com.university.lms.assessment.domain.QuizAttempt;
import com.university.lms.assessment.domain.QuestionBank;
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
        Quiz quiz = attempt.getQuiz();
        Map<String, Object> userAnswers = attempt.getAnswers();

        if (userAnswers == null || userAnswers.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalScore = BigDecimal.ZERO;

        try {
            // Iterate through all questions in the quiz
            for (var quizQuestion : quiz.getQuizQuestions()) {
                QuestionBank question = quizQuestion.getQuestion();
                String questionId = question.getId().toString();

                // Get user's answer for this question
                Object userAnswer = userAnswers.get(questionId);
                if (userAnswer == null) {
                    continue; // Skip unanswered questions
                }

                // Calculate score based on question type
                BigDecimal questionScore = gradeQuestion(question, userAnswer);
                BigDecimal questionPoints = quizQuestion.getEffectivePoints();

                // Add to total score
                totalScore = totalScore.add(questionScore.multiply(questionPoints));

                log.debug("Question {} scored: {} / {}", questionId, questionScore, questionPoints);
            }

            log.info("Auto-grading complete. Total score: {}", totalScore);
            return totalScore;

        } catch (Exception e) {
            log.error("Error during auto-grading: {}", e.getMessage(), e);
            // Return null to indicate manual grading needed
            return null;
        }
    }

    /**
     * Grade a single question based on its type.
     * Returns a score between 0 and 1 (percentage correct).
     */
    private BigDecimal gradeQuestion(QuestionBank question, Object userAnswer) {
        String questionType = question.getQuestionType();
        Map<String, Object> correctAnswer = question.getCorrectAnswer();

        if (correctAnswer == null || correctAnswer.isEmpty()) {
            log.warn("No correct answer defined for question: {}", question.getId());
            return BigDecimal.ZERO;
        }

        switch (questionType.toUpperCase()) {
            case "MULTIPLE_CHOICE":
                return gradeMultipleChoice(userAnswer, correctAnswer);

            case "TRUE_FALSE":
                return gradeTrueFalse(userAnswer, correctAnswer);

            case "NUMERICAL":
                return gradeNumerical(userAnswer, correctAnswer);

            case "FILL_BLANK":
                return gradeFillBlank(userAnswer, correctAnswer);

            case "MATCHING":
                return gradeMatching(userAnswer, correctAnswer);

            case "ORDERING":
                return gradeOrdering(userAnswer, correctAnswer);

            // Essay, short answer, code, and file upload need manual grading
            case "SHORT_ANSWER":
            case "ESSAY":
            case "CODE":
            case "FILE_UPLOAD":
                log.debug("Question type {} requires manual grading", questionType);
                return BigDecimal.ZERO;

            default:
                log.warn("Unknown question type: {}", questionType);
                return BigDecimal.ZERO;
        }
    }

    private BigDecimal gradeMultipleChoice(Object userAnswer, Map<String, Object> correctAnswer) {
        String correctChoice = (String) correctAnswer.get("choice");
        if (correctChoice != null && correctChoice.equals(userAnswer.toString())) {
            return BigDecimal.ONE;
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal gradeTrueFalse(Object userAnswer, Map<String, Object> correctAnswer) {
        Boolean correctValue = (Boolean) correctAnswer.get("value");
        if (correctValue != null) {
            String userAnswerStr = userAnswer.toString().toLowerCase();
            boolean userBool = userAnswerStr.equals("true") || userAnswerStr.equals("yes") || userAnswerStr.equals("1");
            return correctValue == userBool ? BigDecimal.ONE : BigDecimal.ZERO;
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal gradeNumerical(Object userAnswer, Map<String, Object> correctAnswer) {
        try {
            Double correctValue = ((Number) correctAnswer.get("value")).doubleValue();
            Double tolerance = correctAnswer.containsKey("tolerance")
                ? ((Number) correctAnswer.get("tolerance")).doubleValue()
                : 0.01; // Default 1% tolerance

            Double userValue = Double.parseDouble(userAnswer.toString());
            double diff = Math.abs(correctValue - userValue);
            double allowedDiff = Math.abs(correctValue * tolerance);

            return diff <= allowedDiff ? BigDecimal.ONE : BigDecimal.ZERO;
        } catch (Exception e) {
            log.error("Error grading numerical question: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal gradeFillBlank(Object userAnswer, Map<String, Object> correctAnswer) {
        @SuppressWarnings("unchecked")
        List<String> correctAnswers = (List<String>) correctAnswer.get("answers");
        @SuppressWarnings("unchecked")
        Map<String, Object> userAnswerMap = (Map<String, Object>) userAnswer;
        @SuppressWarnings("unchecked")
        List<String> userAnswers = (List<String>) userAnswerMap.get("answers");

        if (correctAnswers == null || userAnswers == null) {
            return BigDecimal.ZERO;
        }

        int correct = 0;
        for (int i = 0; i < Math.min(correctAnswers.size(), userAnswers.size()); i++) {
            if (correctAnswers.get(i).trim().equalsIgnoreCase(userAnswers.get(i).trim())) {
                correct++;
            }
        }

        return BigDecimal.valueOf(correct).divide(
            BigDecimal.valueOf(correctAnswers.size()),
            2,
            java.math.RoundingMode.HALF_UP
        );
    }

    private BigDecimal gradeMatching(Object userAnswer, Map<String, Object> correctAnswer) {
        @SuppressWarnings("unchecked")
        Map<String, String> correctPairs = (Map<String, String>) correctAnswer.get("pairs");
        @SuppressWarnings("unchecked")
        Map<String, Object> userAnswerMap = (Map<String, Object>) userAnswer;
        @SuppressWarnings("unchecked")
        Map<String, String> userPairs = (Map<String, String>) userAnswerMap.get("pairs");

        if (correctPairs == null || userPairs == null) {
            return BigDecimal.ZERO;
        }

        int correct = 0;
        for (Map.Entry<String, String> entry : correctPairs.entrySet()) {
            if (entry.getValue().equals(userPairs.get(entry.getKey()))) {
                correct++;
            }
        }

        return BigDecimal.valueOf(correct).divide(
            BigDecimal.valueOf(correctPairs.size()),
            2,
            java.math.RoundingMode.HALF_UP
        );
    }

    private BigDecimal gradeOrdering(Object userAnswer, Map<String, Object> correctAnswer) {
        @SuppressWarnings("unchecked")
        List<String> correctOrder = (List<String>) correctAnswer.get("order");
        @SuppressWarnings("unchecked")
        List<String> userOrder = (List<String>) userAnswer;

        if (correctOrder == null || userOrder == null || correctOrder.size() != userOrder.size()) {
            return BigDecimal.ZERO;
        }

        return correctOrder.equals(userOrder) ? BigDecimal.ONE : BigDecimal.ZERO;
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
