package com.university.lms.apigateway.dto;

import java.time.Instant;

/**
 * Snapshot of a discovered service instance.
 */
public record ServiceStatusDto(
        String serviceName,
        String instanceId,
        String status,
        String host,
        int port,
        String healthUrl,
        Instant lastUpdated
) {
}
