package com.university.lms.gradebook.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(schema = "grading", name = "gradebook_entries",
        uniqueConstraints = @UniqueConstraint(name = "uk_gradebook_entry_course_student_assignment",
                columnNames = {"course_id", "student_id", "assignment_id"}),
        indexes = {
                @Index(name = "idx_gradebook_entry_course_student", columnList = "course_id, student_id"),
                @Index(name = "idx_gradebook_entry_status", columnList = "status"),
                @Index(name = "idx_gradebook_entry_graded_at", columnList = "graded_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradebookEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(precision = 6, scale = 2)
    private BigDecimal score;

    @Column(name = "max_score", nullable = false, precision = 6, scale = 2)
    private BigDecimal maxScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal percentage;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "grading.grade_status")
    @Builder.Default
    private GradeStatus status = GradeStatus.NOT_SUBMITTED;

    @Column(name = "is_late", nullable = false)
    @Builder.Default
    private boolean late = false;

    @Column(name = "is_excused", nullable = false)
    @Builder.Default
    private boolean excused = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "submission_id")
    private UUID submissionId;

    @Column(name = "draft_score", precision = 6, scale = 2)
    private BigDecimal draftScore;

    @Column(name = "draft_comment", columnDefinition = "TEXT")
    private String draftComment;

    @Column(name = "draft_graded_by")
    private UUID draftGradedBy;

    @Column(name = "draft_graded_at")
    private LocalDateTime draftGradedAt;

    @Column(name = "published_score", precision = 6, scale = 2)
    private BigDecimal publishedScore;

    @Column(name = "published_comment", columnDefinition = "TEXT")
    private String publishedComment;

    @Column(name = "published_by")
    private UUID publishedBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "override_score", precision = 6, scale = 2)
    private BigDecimal overrideScore;

    @Column(name = "override_by")
    private UUID overrideBy;

    @Column(name = "override_at")
    private LocalDateTime overrideAt;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public BigDecimal getFinalScore() {
        return overrideScore != null ? overrideScore : score;
    }

    public BigDecimal getPublishedFinalScore() {
        if (overrideScore != null) {
            return overrideScore;
        }
        return publishedScore != null ? publishedScore : score;
    }

    public String getPublishedFinalComment() {
        return publishedComment != null ? publishedComment : notes;
    }

    public boolean isPublishedGrade() {
        return status == GradeStatus.PUBLISHED || status == GradeStatus.GRADED;
    }

    public boolean hasDraftGrade() {
        return draftScore != null || status == GradeStatus.DRAFT;
    }

    public void calculatePercentage() {
        BigDecimal finalScore = isPublishedGrade() ? getPublishedFinalScore() : draftScore;
        if (finalScore != null && maxScore != null && maxScore.compareTo(BigDecimal.ZERO) > 0) {
            this.percentage = finalScore.divide(maxScore, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        } else {
            this.percentage = null;
        }
    }

    @PrePersist
    @PreUpdate
    private void prePersist() {
        calculatePercentage();
    }
}
