package com.university.lms.marketplace.repository;

import com.university.lms.marketplace.domain.MarketplaceReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface MarketplaceReviewRepository extends JpaRepository<MarketplaceReview, UUID> {

    Page<MarketplaceReview> findByMarketplacePluginId(UUID marketplacePluginId, Pageable pageable);

    Optional<MarketplaceReview> findByMarketplacePluginIdAndUserId(UUID marketplacePluginId, UUID userId);

    boolean existsByMarketplacePluginIdAndUserId(UUID marketplacePluginId, UUID userId);

    /**
     * Computes the arithmetic mean of all ratings for a given plugin.
     * Returns null when no reviews exist.
     */
    @Query("SELECT AVG(r.rating) FROM MarketplaceReview r WHERE r.marketplacePlugin.id = :pluginId")
    Double findAverageRatingByPluginId(@Param("pluginId") UUID pluginId);

    @Query("SELECT COUNT(r) FROM MarketplaceReview r WHERE r.marketplacePlugin.id = :pluginId")
    long countByMarketplacePluginId(@Param("pluginId") UUID pluginId);
}
