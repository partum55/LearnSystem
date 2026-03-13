package com.university.lms.marketplace.repository;

import com.university.lms.marketplace.domain.MarketplacePluginVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MarketplacePluginVersionRepository extends JpaRepository<MarketplacePluginVersion, UUID> {

    Optional<MarketplacePluginVersion> findByMarketplacePluginIdAndIsLatestTrue(UUID marketplacePluginId);

    List<MarketplacePluginVersion> findByMarketplacePluginIdOrderByPublishedAtDesc(UUID marketplacePluginId);

    Optional<MarketplacePluginVersion> findByMarketplacePluginIdAndVersion(UUID marketplacePluginId, String version);

    boolean existsByMarketplacePluginIdAndVersion(UUID marketplacePluginId, String version);

    /**
     * Clears the isLatest flag on all versions of the given plugin so that a new latest
     * version can be promoted atomically.
     */
    @Modifying
    @Query("UPDATE MarketplacePluginVersion v SET v.isLatest = false WHERE v.marketplacePlugin.id = :pluginId")
    void clearLatestFlagForPlugin(@Param("pluginId") UUID pluginId);
}
