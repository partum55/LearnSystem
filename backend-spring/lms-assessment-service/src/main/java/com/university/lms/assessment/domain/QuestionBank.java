package com.university.lms.assessment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Question bank entity for storing reusable questions.
 */
@Entity
@Table(name = "question_bank", indexes = {
    @Index(name = "idx_question_course", columnList = "course_id"),
    @Index(name = "idx_question_type", columnList = "question_type"),
    @Index(name = "idx_question_created_by", columnList = "created_by")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionBank {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Allow questions to be global (not tied to a specific course)
    @Column(name = "course_id")
    private UUID courseId;

    @Column(name = "question_type", nullable = false, length = 30)
    private String questionType; // MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK, MATCHING, NUMERICAL, FORMULA, SHORT_ANSWER, ESSAY, CODE, FILE_UPLOAD, ORDERING, HOTSPOT, DRAG_DROP

    @Column(nullable = false, columnDefinition = "TEXT")
    private String stem; // The main question text

    // Options for multiple choice, matching, etc.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> options = new HashMap<>();

    // Correct answer(s)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "correct_answer", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> correctAnswer = new HashMap<>();

    // Explanation/feedback
    @Column(columnDefinition = "TEXT")
    private String explanation;

    // Points for this question
    @Column(precision = 6, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal points = BigDecimal.ONE;

    // Metadata: difficulty, tags, etc.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    // Audit fields
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper methods
    public String getDifficulty() {
        return metadata != null ? (String) metadata.get("difficulty") : null;
    }

    public void setDifficulty(String difficulty) {
        if (metadata == null) {
            metadata = new HashMap<>();
        }
        metadata.put("difficulty", difficulty);
    }
}

