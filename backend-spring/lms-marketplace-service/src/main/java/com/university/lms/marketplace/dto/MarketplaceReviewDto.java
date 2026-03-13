package com.university.lms.marketplace.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO representing a single user review for a marketplace plugin.
 */
public record MarketplaceReviewDto(
        UUID id,
        UUID userId,
        Integer rating,
        String title,
        String body,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
