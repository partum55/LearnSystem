package com.university.lms.assessment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Association between Quiz and Questions with position and point overrides.
 */
@Entity
@Table(name = "quiz_questions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_quiz_question", columnNames = {"quiz_id", "question_id"})
    },
    indexes = {
        @Index(name = "idx_quiz_question_quiz", columnList = "quiz_id"),
        @Index(name = "idx_quiz_question_position", columnList = "quiz_id, position")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuestionBank question;

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    @Column(name = "points_override", precision = 6, scale = 2)
    private BigDecimal pointsOverride;

    // Helper method
    public BigDecimal getEffectivePoints() {
        return pointsOverride != null ? pointsOverride : question.getPoints();
    }
}

