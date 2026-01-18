package com.university.lms.apigateway.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SystemHealthDto(
    String overallStatus,
    int totalServices,
    int healthyServices,
    int unhealthyServices,
    List<ServiceStatusDto> services,
    Map<String, Object> systemInfo,
    Instant timestamp
) {}
