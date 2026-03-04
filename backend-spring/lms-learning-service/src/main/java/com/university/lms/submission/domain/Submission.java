package com.university.lms.submission.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Submission aggregate root.
 */
@Entity
@Table(name = "submissions", indexes = {
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

        @Column(name = "student_name", length = 255)
        private String studentName;

        @Column(name = "student_email", length = 255)
        private String studentEmail;

        @Column(name = "status", nullable = false, length = 32)
        @Builder.Default
        private String status = "DRAFT";

        @Column(name = "submission_version", nullable = false)
        @Builder.Default
        private Integer submissionVersion = 1;

        @Column(name = "text_answer", columnDefinition = "TEXT")
        private String textAnswer;

        @Column(name = "submission_url", length = 1000)
        private String submissionUrl;

        @Column(name = "programming_language", length = 50)
        private String programmingLanguage;

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

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "rubric_evaluation", columnDefinition = "jsonb")
        @Builder.Default
        private Map<String, Object> rubricEvaluation = new HashMap<>();

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

        @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
        @Fetch(FetchMode.SUBSELECT)
        @Builder.Default
        private Set<SubmissionFile> files = new LinkedHashSet<>();

        @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
        @Fetch(FetchMode.SUBSELECT)
        @Builder.Default
        private Set<SubmissionComment> comments = new LinkedHashSet<>();

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, updatable = false)
        private LocalDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at", nullable = false)
        private LocalDateTime updatedAt;
}
