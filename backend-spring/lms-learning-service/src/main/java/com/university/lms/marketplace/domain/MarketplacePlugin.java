package com.university.lms.marketplace.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
    name = "marketplace_plugins",
    indexes = {
      @Index(name = "idx_mp_plugins_type", columnList = "type"),
      @Index(name = "idx_mp_plugins_category", columnList = "category"),
      @Index(name = "idx_mp_plugins_verified", columnList = "is_verified"),
      @Index(name = "idx_mp_plugins_featured", columnList = "is_featured")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class MarketplacePlugin {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "plugin_id", nullable = false, unique = true, length = 255)
  private String pluginId;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(nullable = false, length = 255)
  private String author;

  @Column(name = "author_url", length = 500)
  private String authorUrl;

  @Column(nullable = false, length = 50)
  private String type;

  @Column(length = 100)
  private String category;

  @Column(name = "icon_url", length = 500)
  private String iconUrl;

  @Column(name = "homepage_url", length = 500)
  private String homepageUrl;

  @Column(name = "repository_url", length = 500)
  private String repositoryUrl;

  @Column(name = "min_lms_version", length = 50)
  private String minLmsVersion;

  @Column(name = "is_verified", nullable = false)
  @Builder.Default
  private Boolean isVerified = false;

  @Column(name = "is_featured", nullable = false)
  @Builder.Default
  private Boolean isFeatured = false;

  @Column(name = "total_downloads", nullable = false)
  @Builder.Default
  private Long totalDownloads = 0L;

  @Column(name = "average_rating", precision = 3, scale = 2)
  @Builder.Default
  private BigDecimal averageRating = BigDecimal.ZERO;

  @Column(name = "review_count", nullable = false)
  @Builder.Default
  private Integer reviewCount = 0;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @OneToMany(mappedBy = "marketplacePlugin", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("publishedAt DESC")
  @Builder.Default
  private List<MarketplacePluginVersion> versions = new ArrayList<>();

  @OneToMany(mappedBy = "marketplacePlugin", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt DESC")
  @Builder.Default
  private List<MarketplaceReview> reviews = new ArrayList<>();
}
