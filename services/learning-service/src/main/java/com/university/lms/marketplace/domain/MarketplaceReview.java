package com.university.lms.marketplace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "marketplace_reviews",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_review_user_plugin",
            columnNames = {"marketplace_plugin_id", "user_id"}),
    indexes = {@Index(name = "idx_mp_reviews_plugin", columnList = "marketplace_plugin_id")})
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

  @Column(name = "user_id", nullable = false)
  private UUID userId;

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
