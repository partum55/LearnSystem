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

@Entity
@Table(schema = "learning", name = "assignments", indexes = {
    @Index(name = "idx_assignment_course",    columnList = "course_id"),
    @Index(name = "idx_assignment_module",    columnList = "module_id"),
    @Index(name = "idx_assignment_type",      columnList = "assignment_type"),
    @Index(name = "idx_assignment_status",    columnList = "status"),
    @Index(name = "idx_assignment_due_date",  columnList = "due_date")
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

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "assignment_type", nullable = false, columnDefinition = "learning.assignment_type")
    private AssignmentType assignmentType;

    @Column(nullable = false, length = 255)
    private String title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "instructions_json", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> instructionsJson = new HashMap<>();

    @Column(name = "max_points", precision = 6, scale = 2, nullable = false)
    private BigDecimal maxPoints;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "available_from")
    private LocalDateTime availableFrom;

    @Column(name = "available_until")
    private LocalDateTime availableUntil;

    @Column(name = "allow_late_submission")
    @Builder.Default
    private Boolean allowLateSubmission = false;

    @Column(name = "late_penalty_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal latePenaltyPercent = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> settings = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "learning.assignment_status")
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.DRAFT;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public boolean isAvailable() {
        if (status != AssignmentStatus.PUBLISHED) return false;
        LocalDateTime now = LocalDateTime.now();
        if (availableFrom != null && now.isBefore(availableFrom)) return false;
        if (availableUntil != null && now.isAfter(availableUntil)) return false;
        return true;
    }

    public boolean isOverdue() {
        return dueDate != null && LocalDateTime.now().isAfter(dueDate);
    }

    public boolean acceptsLateSubmission() {
        return allowLateSubmission || !isOverdue();
    }
}
