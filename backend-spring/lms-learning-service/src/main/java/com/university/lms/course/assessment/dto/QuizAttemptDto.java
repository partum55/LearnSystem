package com.university.lms.course.assessment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for QuizAttempt responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptDto {

    private UUID id;
    private UUID quizId;
    private UUID userId;
    private Integer attemptNumber;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

    // Answers stored as JSON: { "questionId": "answer", ... }
    private Map<String, Object> answers;

    // Scoring
    private BigDecimal autoScore;
    private BigDecimal manualScore;
    private BigDecimal finalScore;

    private UUID gradedBy;
    private LocalDateTime gradedAt;
    private String feedback;

    // Security and proctoring
    private String ipAddress;
    private String browserFingerprint;
    private Map<String, Object> proctoringData;

    // Computed fields
    private Boolean submitted;
    private Boolean graded;
    private Boolean inProgress;
    private Long durationInMinutes;
    private LocalDateTime expiresAt;
    private Long remainingSeconds;
    private Boolean timedOut;
}
