package com.university.lms.assessment.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Represents a rubric criterion for peer review
 */
@Entity
@Table(name = "peer_review_rubrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeerReviewRubric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "criterion_name", nullable = false)
    private String criterionName;

    @Column(name = "criterion_description", columnDefinition = "TEXT")
    private String criterionDescription;

    @Column(name = "max_points", nullable = false)
    private Integer maxPoints;

    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
