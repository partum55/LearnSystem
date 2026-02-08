package com.university.lms.apigateway.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Aggregated health view returned by the gateway admin endpoints.
 */
public record SystemHealthDto(
        String overallStatus,
        int totalServices,
        int healthyServices,
        int unhealthyServices,
        List<ServiceStatusDto> services,
        Map<String, Object> systemInfo,
        Instant timestamp
) {
}
