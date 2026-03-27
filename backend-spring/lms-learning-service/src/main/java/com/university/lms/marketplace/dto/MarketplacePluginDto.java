package com.university.lms.marketplace.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MarketplacePluginDto(
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
    String latestVersion,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
