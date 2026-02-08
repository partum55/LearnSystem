package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Assignment entity with support for multiple types.
 * Supports quizzes, file uploads, text submissions, code submissions, and more.
 */
@Entity
@Table(name = "assignments", indexes = {
    @Index(name = "idx_assignment_course", columnList = "course_id"),
    @Index(name = "idx_assignment_module", columnList = "module_id"),
    @Index(name = "idx_assignment_type", columnList = "assignment_type"),
    @Index(name = "idx_assignment_published", columnList = "is_published"),
    @Index(name = "idx_assignment_due_date", columnList = "due_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "module_id")
    private UUID moduleId;

    @Column(name = "category_id")
    private UUID categoryId; // Gradebook category

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    @Column(name = "assignment_type", nullable = false, length = 20)
    private String assignmentType; // QUIZ, FILE_UPLOAD, TEXT, CODE, URL, MANUAL_GRADE, EXTERNAL, VIRTUAL_LAB

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "description_format", length = 20)
    @Builder.Default
    private String descriptionFormat = "MARKDOWN"; // PLAIN, MARKDOWN, HTML, RICH

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "instructions_format", length = 20)
    @Builder.Default
    private String instructionsFormat = "MARKDOWN";

    // Resources (reference materials, attachments)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> resources = new ArrayList<>();

    // Code submission settings
    @Column(name = "starter_code", columnDefinition = "TEXT")
    private String starterCode;

    @Column(name = "solution_code", columnDefinition = "TEXT")
    private String solutionCode;

    @Column(name = "programming_language", length = 50)
    private String programmingLanguage;

    @Column(name = "auto_grading_enabled")
    @Builder.Default
    private Boolean autoGradingEnabled = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "test_cases", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> testCases = new ArrayList<>();

    // Points and grading
    @Column(name = "max_points", precision = 6, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal maxPoints = BigDecimal.valueOf(100.00);

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> rubric = new HashMap<>();

    // Dates
    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "available_from")
    private LocalDateTime availableFrom;

    @Column(name = "available_until")
    private LocalDateTime availableUntil;

    // Late submission
    @Column(name = "allow_late_submission")
    @Builder.Default
    private Boolean allowLateSubmission = false;

    @Column(name = "late_penalty_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal latePenaltyPercent = BigDecimal.ZERO;

    // Submission settings
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "submission_types", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> submissionTypes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_file_types", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> allowedFileTypes = new ArrayList<>();

    @Column(name = "max_file_size")
    @Builder.Default
    private Long maxFileSize = 10485760L; // 10 MB

    @Column(name = "max_files")
    @Builder.Default
    private Integer maxFiles = 5;

    // Quiz reference
    @Column(name = "quiz_id")
    private UUID quizId;

    // External tool settings
    @Column(name = "external_tool_url", length = 500)
    private String externalToolUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "external_tool_config", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> externalToolConfig = new HashMap<>();

    // Grading options
    @Column(name = "grade_anonymously")
    @Builder.Default
    private Boolean gradeAnonymously = false;

    @Column(name = "peer_review_enabled")
    @Builder.Default
    private Boolean peerReviewEnabled = false;

    @Column(name = "peer_reviews_required")
    @Builder.Default
    private Integer peerReviewsRequired = 0;

    // Tags and metadata
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Column(name = "estimated_duration")
    private Integer estimatedDuration; // in minutes

    // Template and archiving
    @Column(name = "is_template")
    @Builder.Default
    private Boolean isTemplate = false;

    @Column(name = "is_archived")
    @Builder.Default
    private Boolean isArchived = false;

    @Column(name = "original_assignment_id")
    private UUID originalAssignmentId;

    @Column(name = "is_published")
    @Builder.Default
    private Boolean isPublished = false;

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
    public boolean requiresSubmission() {
        return !"MANUAL_GRADE".equals(assignmentType) && !"QUIZ".equals(assignmentType);
    }

    public boolean isAvailable() {
        LocalDateTime now = LocalDateTime.now();

        if (availableFrom != null && now.isBefore(availableFrom)) {
            return false;
        }

        if (availableUntil != null && now.isAfter(availableUntil)) {
            return false;
        }

        return isPublished;
    }

    public boolean isOverdue() {
        return dueDate != null && LocalDateTime.now().isAfter(dueDate);
    }

    public boolean acceptsLateSubmission() {
        return allowLateSubmission || !isOverdue();
    }
}

