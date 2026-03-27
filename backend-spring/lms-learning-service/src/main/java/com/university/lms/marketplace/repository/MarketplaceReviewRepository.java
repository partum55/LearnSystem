package com.university.lms.marketplace.repository;

import com.university.lms.marketplace.domain.MarketplaceReview;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MarketplaceReviewRepository extends JpaRepository<MarketplaceReview, UUID> {

  Page<MarketplaceReview> findByMarketplacePluginId(UUID marketplacePluginId, Pageable pageable);

  boolean existsByMarketplacePluginIdAndUserId(UUID marketplacePluginId, UUID userId);

  @Query("SELECT AVG(r.rating) FROM MarketplaceReview r WHERE r.marketplacePlugin.id = :pluginId")
  Double findAverageRatingByPluginId(@Param("pluginId") UUID pluginId);

  @Query("SELECT COUNT(r) FROM MarketplaceReview r WHERE r.marketplacePlugin.id = :pluginId")
  long countByMarketplacePluginId(@Param("pluginId") UUID pluginId);
}
