package com.university.lms.marketplace.repository;

import com.university.lms.marketplace.domain.MarketplacePlugin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MarketplacePluginRepository extends JpaRepository<MarketplacePlugin, UUID> {

    Optional<MarketplacePlugin> findByPluginId(String pluginId);

    List<MarketplacePlugin> findByTypeAndCategory(String type, String category);

    List<MarketplacePlugin> findByType(String type);

    List<MarketplacePlugin> findByCategory(String category);

    Page<MarketplacePlugin> findByNameContainingIgnoreCase(String name, Pageable pageable);

    Page<MarketplacePlugin> findAll(Pageable pageable);

    Page<MarketplacePlugin> findByType(String type, Pageable pageable);

    Page<MarketplacePlugin> findByCategory(String category, Pageable pageable);

    Page<MarketplacePlugin> findByTypeAndCategory(String type, String category, Pageable pageable);

    /**
     * Full-text search across name, description, and author fields,
     * with optional type and category filters. Null parameters are treated as "match all".
     */
    @Query("""
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

    /** Returns the distinct category values currently present in the catalogue. */
    @Query("SELECT DISTINCT p.category FROM MarketplacePlugin p WHERE p.category IS NOT NULL ORDER BY p.category")
    List<String> findDistinctCategories();

    /** Returns the distinct type values currently present in the catalogue. */
    @Query("SELECT DISTINCT p.type FROM MarketplacePlugin p ORDER BY p.type")
    List<String> findDistinctTypes();

    List<MarketplacePlugin> findByIsFeaturedTrue();
}
