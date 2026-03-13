package com.university.lms.marketplace.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A user review for a {@link MarketplacePlugin}.
 * Each user may post at most one review per plugin (enforced by the unique constraint).
 */
@Entity
@Table(
    name = "marketplace_reviews",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_review_user_plugin",
        columnNames = {"marketplace_plugin_id", "user_id"}
    ),
    indexes = {
        @Index(name = "idx_mp_reviews_plugin", columnList = "marketplace_plugin_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketplaceReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "marketplace_plugin_id", nullable = false)
    private MarketplacePlugin marketplacePlugin;

    /** UUID of the user who authored the review; stored to avoid cross-service JPA joins. */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Integer star rating between 1 and 5 inclusive. */
    @Column(nullable = false)
    private Integer rating;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
