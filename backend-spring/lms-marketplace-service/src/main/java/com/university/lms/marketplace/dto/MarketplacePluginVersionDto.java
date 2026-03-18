package com.university.lms.marketplace.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO representing a single versioned release of a marketplace plugin.
 */
public record MarketplacePluginVersionDto(
        UUID id,
        String version,
        String changelog,
        String downloadUrl,
        Long fileSize,
        String checksum,
        Boolean isLatest,
        OffsetDateTime publishedAt
) {}
