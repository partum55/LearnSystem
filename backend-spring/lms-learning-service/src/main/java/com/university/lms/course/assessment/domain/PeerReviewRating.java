package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents a rating for a specific rubric criterion in a peer review
 */
@Entity
@Table(name = "peer_review_ratings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeerReviewRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "peer_review_id", nullable = false)
    private Long peerReviewId;

    @Column(name = "rubric_id", nullable = false)
    private Long rubricId;

    @Column(name = "score", nullable = false)
    private BigDecimal score;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

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
