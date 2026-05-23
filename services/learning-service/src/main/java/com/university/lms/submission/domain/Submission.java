package com.university.lms.submission.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Submission aggregate root.
 */
@Entity
@Table(schema = "learning", name = "assignment_submissions", indexes = {
                @Index(name = "idx_submissions_assignment", columnList = "assignment_id"),
                @Index(name = "idx_submissions_user", columnList = "user_id"),
                @Index(name = "idx_submissions_status", columnList = "status"),
                @Index(name = "idx_submissions_submitted_at", columnList = "submitted_at")
}, uniqueConstraints = {
                @UniqueConstraint(name = "uk_submissions_assignment_user", columnNames = { "assignment_id", "user_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {

        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        private UUID id;

        @Column(name = "assignment_id", nullable = false)
        private UUID assignmentId;

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Enumerated(EnumType.STRING)
        @JdbcTypeCode(SqlTypes.NAMED_ENUM)
        @Column(name = "status", nullable = false, columnDefinition = "learning.submission_status")
        @Builder.Default
        private SubmissionStatus status = SubmissionStatus.DRAFT;

        @Column(name = "submission_version", nullable = false)
        @Builder.Default
        private Integer submissionVersion = 1;

        @Column(name = "text_answer", columnDefinition = "TEXT")
        private String textAnswer;

        @Column(name = "submission_url", length = 1000)
        private String submissionUrl;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "form_data", columnDefinition = "jsonb")
        private Map<String, Object> formData;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "auto_grade_result", columnDefinition = "jsonb")
        private Map<String, Object> autoGradeResult;

        @Column(name = "grade", precision = 6, scale = 2)
        private BigDecimal grade;

        @Column(name = "raw_score", precision = 6, scale = 2)
        private BigDecimal rawScore;

        @Column(name = "draft_grade", precision = 6, scale = 2)
        private BigDecimal draftGrade;

        @Column(name = "draft_feedback", columnDefinition = "TEXT")
        private String draftFeedback;

        @Column(name = "published_grade", precision = 6, scale = 2)
        private BigDecimal publishedGrade;

        @Column(name = "published_feedback", columnDefinition = "TEXT")
        private String publishedFeedback;

        @Column(name = "published_at")
        private LocalDateTime publishedAt;

        @Column(name = "published_by")
        private UUID publishedBy;

        @Column(name = "review_started_at")
        private LocalDateTime reviewStartedAt;

        @Column(name = "last_resubmitted_at")
        private LocalDateTime lastResubmittedAt;

        @Column(name = "feedback", columnDefinition = "TEXT")
        private String feedback;

        @Column(name = "is_late", nullable = false)
        @Builder.Default
        private Boolean isLate = false;

        @Column(name = "days_late")
        @Builder.Default
        private Integer daysLate = 0;

        @Column(name = "submitted_at")
        private LocalDateTime submittedAt;

        @Column(name = "graded_at")
        private LocalDateTime gradedAt;

        @Column(name = "grader_id")
        private UUID graderId;

        @Version
        @Column(name = "version", nullable = false)
        @Builder.Default
        private Long version = 0L;

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, updatable = false)
        private LocalDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at", nullable = false)
        private LocalDateTime updatedAt;
}
