package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Quiz/Test entity.
 */
@Entity
@Table(name = "quizzes", indexes = {
        @Index(name = "idx_quiz_course", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Quiz settings
    @Column(name = "time_limit")
    private Integer timeLimit; // in minutes

    @Column(name = "timer_enabled", nullable = false)
    @Builder.Default
    private Boolean timerEnabled = false;

    @Column(name = "attempts_allowed")
    private Integer attemptsAllowed;

    @Column(name = "attempt_limit_enabled", nullable = false)
    @Builder.Default
    private Boolean attemptLimitEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "attempt_score_policy", nullable = false, length = 16)
    @Builder.Default
    private AttemptScorePolicy attemptScorePolicy = AttemptScorePolicy.HIGHEST;

    @Column(name = "secure_session_enabled", nullable = false)
    @Builder.Default
    private Boolean secureSessionEnabled = false;

    @Column(name = "secure_require_fullscreen", nullable = false)
    @Builder.Default
    private Boolean secureRequireFullscreen = true;

    // Question settings
    @Column(name = "shuffle_questions")
    @Builder.Default
    private Boolean shuffleQuestions = false;

    @Column(name = "shuffle_answers")
    @Builder.Default
    private Boolean shuffleAnswers = false;

    // Display settings
    @Column(name = "show_correct_answers")
    @Builder.Default
    private Boolean showCorrectAnswers = true;

    @Column(name = "show_correct_answers_at")
    private LocalDateTime showCorrectAnswersAt;

    // Grading settings
    @Column(name = "pass_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal passPercentage = BigDecimal.valueOf(60.00);

    // Audit fields
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private Set<QuizQuestion> quizQuestions = new HashSet<>();

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private java.util.List<QuizSection> sections = new java.util.ArrayList<>();

    // Helper methods
    public boolean canShowCorrectAnswers() {
        if (!showCorrectAnswers) {
            return false;
        }
        if (showCorrectAnswersAt == null) {
            return true;
        }
        return LocalDateTime.now().isAfter(showCorrectAnswersAt);
    }

    public int getTotalQuestions() {
        return quizQuestions.size();
    }

    public BigDecimal getTotalPoints() {
        return quizQuestions.stream()
                .map(qq -> qq.getPointsOverride() != null ? qq.getPointsOverride() : qq.getQuestion().getPoints())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
