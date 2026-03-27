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

@Entity
@Table(
    name = "marketplace_plugin_versions",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_plugin_version",
            columnNames = {"marketplace_plugin_id", "version"}),
    indexes = {@Index(name = "idx_mp_versions_plugin", columnList = "marketplace_plugin_id")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketplacePluginVersion {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "marketplace_plugin_id", nullable = false)
  private MarketplacePlugin marketplacePlugin;

  @Column(nullable = false, length = 50)
  private String version;

  @Column(columnDefinition = "TEXT")
  private String changelog;

  @Column(name = "download_url", nullable = false, length = 500)
  private String downloadUrl;

  @Column(name = "file_size")
  private Long fileSize;

  @Column(length = 128)
  private String checksum;

  @Column(name = "is_latest", nullable = false)
  @Builder.Default
  private Boolean isLatest = false;

  @Column(name = "published_at", nullable = false)
  @Builder.Default
  private OffsetDateTime publishedAt = OffsetDateTime.now();
}
