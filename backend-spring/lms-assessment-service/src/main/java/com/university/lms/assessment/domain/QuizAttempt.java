package com.university.lms.assessment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Student attempt at a quiz with answers and scoring.
 */
@Entity
@Table(name = "quiz_attempts",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_quiz_user_attempt", columnNames = {"quiz_id", "user_id", "attempt_number"})
    },
    indexes = {
        @Index(name = "idx_quiz_attempt_quiz", columnList = "quiz_id"),
        @Index(name = "idx_quiz_attempt_user", columnList = "user_id"),
        @Index(name = "idx_quiz_attempt_started", columnList = "started_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "attempt_number", nullable = false)
    @Builder.Default
    private Integer attemptNumber = 1;

    @CreationTimestamp
    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    // Answers stored as JSON: { "questionId": "answer", ... }
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> answers = new HashMap<>();

    // Scoring
    @Column(name = "auto_score", precision = 6, scale = 2)
    private BigDecimal autoScore;

    @Column(name = "manual_score", precision = 6, scale = 2)
    private BigDecimal manualScore;

    @Column(name = "final_score", precision = 6, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "graded_by")
    private UUID gradedBy;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    // Security and proctoring
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "browser_fingerprint", length = 255)
    private String browserFingerprint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "proctoring_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> proctoringData = new HashMap<>();

    // Helper methods
    public boolean isSubmitted() {
        return submittedAt != null;
    }

    public boolean isGraded() {
        return finalScore != null;
    }

    public boolean isInProgress() {
        return !isSubmitted();
    }

    public Long getDurationInMinutes() {
        if (submittedAt == null) {
            return null;
        }
        return java.time.Duration.between(startedAt, submittedAt).toMinutes();
    }
}

