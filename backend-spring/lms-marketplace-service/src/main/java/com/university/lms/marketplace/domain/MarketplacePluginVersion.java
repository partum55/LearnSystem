package com.university.lms.marketplace.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A specific versioned release of a {@link MarketplacePlugin}.
 * Tracks the downloadable artifact, changelog, and integrity checksum.
 */
@Entity
@Table(
    name = "marketplace_plugin_versions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_plugin_version",
        columnNames = {"marketplace_plugin_id", "version"}
    ),
    indexes = {
        @Index(name = "idx_mp_versions_plugin", columnList = "marketplace_plugin_id")
    }
)
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

    /** Semantic version string, e.g. "1.3.0". */
    @Column(nullable = false, length = 50)
    private String version;

    @Column(columnDefinition = "TEXT")
    private String changelog;

    /** Direct URL to the downloadable plugin artifact. */
    @Column(name = "download_url", nullable = false, length = 500)
    private String downloadUrl;

    /** Artifact file size in bytes. */
    @Column(name = "file_size")
    private Long fileSize;

    /** SHA-256 or similar checksum for artifact integrity verification. */
    @Column(length = 128)
    private String checksum;

    /** True for the most recently published version; only one version per plugin may be latest. */
    @Column(name = "is_latest", nullable = false)
    @Builder.Default
    private Boolean isLatest = false;

    @Column(name = "published_at", nullable = false)
    @Builder.Default
    private OffsetDateTime publishedAt = OffsetDateTime.now();
}
