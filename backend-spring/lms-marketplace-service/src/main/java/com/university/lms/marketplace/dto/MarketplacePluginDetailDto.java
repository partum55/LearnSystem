package com.university.lms.marketplace.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full plugin detail response including version history and a paginated review summary.
 * Returned by the single-plugin endpoint where a consumer needs the complete picture.
 */
public record MarketplacePluginDetailDto(
        UUID id,
        String pluginId,
        String name,
        String description,
        String author,
        String authorUrl,
        String type,
        String category,
        String iconUrl,
        String homepageUrl,
        String repositoryUrl,
        String minLmsVersion,
        Boolean isVerified,
        Boolean isFeatured,
        Long totalDownloads,
        BigDecimal averageRating,
        Integer reviewCount,
        /** Full version history ordered by publishedAt descending. */
        List<MarketplacePluginVersionDto> versions,
        /** Most-recent reviews; full paginated list is available via the /reviews sub-resource. */
        List<MarketplaceReviewDto> recentReviews,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
