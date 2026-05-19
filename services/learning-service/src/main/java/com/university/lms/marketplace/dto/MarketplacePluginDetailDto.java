package com.university.lms.marketplace.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

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
    List<MarketplacePluginVersionDto> versions,
    List<MarketplaceReviewDto> recentReviews,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
