package com.university.lms.marketplace.repository;

import com.university.lms.marketplace.domain.MarketplacePluginVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketplacePluginVersionRepository
    extends JpaRepository<MarketplacePluginVersion, UUID> {

  Optional<MarketplacePluginVersion> findByMarketplacePluginIdAndIsLatestTrue(
      UUID marketplacePluginId);

  List<MarketplacePluginVersion> findByMarketplacePluginIdOrderByPublishedAtDesc(
      UUID marketplacePluginId);
}
