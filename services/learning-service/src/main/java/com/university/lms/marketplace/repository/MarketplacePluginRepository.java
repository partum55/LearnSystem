package com.university.lms.marketplace.repository;

import com.university.lms.marketplace.domain.MarketplacePlugin;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MarketplacePluginRepository extends JpaRepository<MarketplacePlugin, UUID> {

  Optional<MarketplacePlugin> findByPluginId(String pluginId);

  @Query(
      """
        SELECT p FROM MarketplacePlugin p
        WHERE (:query IS NULL OR
               LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR
               LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR
               LOWER(p.author) LIKE LOWER(CONCAT('%', :query, '%')))
          AND (:type IS NULL OR p.type = :type)
          AND (:category IS NULL OR p.category = :category)
        """)
  Page<MarketplacePlugin> search(
      @Param("query") String query,
      @Param("type") String type,
      @Param("category") String category,
      Pageable pageable);

  @Query(
      "SELECT DISTINCT p.category FROM MarketplacePlugin p WHERE p.category IS NOT NULL ORDER BY p.category")
  List<String> findDistinctCategories();

  @Query("SELECT DISTINCT p.type FROM MarketplacePlugin p ORDER BY p.type")
  List<String> findDistinctTypes();
}
