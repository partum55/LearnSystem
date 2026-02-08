package com.university.lms.apigateway.controller;

import com.university.lms.apigateway.dto.ServiceStatusDto;
import com.university.lms.apigateway.dto.SystemHealthDto;
import jakarta.validation.constraints.NotBlank;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Administrative endpoints for gateway-level service visibility.
 */
@RestController
@RequestMapping("/api/admin")
@Validated
public class AdminController {

    private static final String STATUS_UP = "UP";
    private static final String OVERALL_HEALTHY = "HEALTHY";
    private static final String OVERALL_UNKNOWN = "UNKNOWN";

    private final DiscoveryClient discoveryClient;

    public AdminController(DiscoveryClient discoveryClient) {
        this.discoveryClient = discoveryClient;
    }

    @GetMapping("/services")
    public ResponseEntity<SystemHealthDto> getServicesHealth() {
        Instant now = Instant.now();
        List<ServiceStatusDto> services = discoveryClient.getServices().stream()
                .sorted()
                .flatMap(serviceName -> discoveryClient.getInstances(serviceName).stream()
                        .map(instance -> toServiceStatus(serviceName, instance, now)))
                .toList();

        int totalServices = services.size();
        int healthyServices = (int) services.stream().filter(service -> STATUS_UP.equals(service.status())).count();
        int unhealthyServices = totalServices - healthyServices;

        SystemHealthDto health = new SystemHealthDto(
                totalServices > 0 ? OVERALL_HEALTHY : OVERALL_UNKNOWN,
                totalServices,
                healthyServices,
                unhealthyServices,
                services,
                buildSystemInfo(),
                now
        );
        return ResponseEntity.ok(health);
    }

    @GetMapping("/services/{serviceName}")
    public ResponseEntity<List<ServiceStatusDto>> getServiceInstances(@PathVariable @NotBlank String serviceName) {
        String resolvedServiceName = resolveServiceName(serviceName).orElse(serviceName);
        Instant now = Instant.now();
        List<ServiceStatusDto> statuses = discoveryClient.getInstances(resolvedServiceName).stream()
                .map(instance -> toServiceStatus(resolvedServiceName, instance, now))
                .toList();
        return ResponseEntity.ok(statuses);
    }

    @GetMapping("/services/names")
    public ResponseEntity<List<String>> getServiceNames() {
        List<String> serviceNames = discoveryClient.getServices().stream()
                .sorted()
                .toList();
        return ResponseEntity.ok(serviceNames);
    }

    private ServiceStatusDto toServiceStatus(String serviceName, ServiceInstance instance, Instant now) {
        String instanceId = instance.getInstanceId() != null
                ? instance.getInstanceId()
                : instance.getHost() + ":" + instance.getPort();

        return new ServiceStatusDto(
                serviceName,
                instanceId,
                STATUS_UP,
                instance.getHost(),
                instance.getPort(),
                instance.getUri() + "/actuator/health",
                now
        );
    }

    private Map<String, Object> buildSystemInfo() {
        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> systemInfo = new LinkedHashMap<>();
        systemInfo.put("javaVersion", System.getProperty("java.version"));
        systemInfo.put("javaVendor", System.getProperty("java.vendor"));
        systemInfo.put("osName", System.getProperty("os.name"));
        systemInfo.put("osVersion", System.getProperty("os.version"));
        systemInfo.put("processors", runtime.availableProcessors());
        systemInfo.put("heapTotalMB", toMegabytes(runtime.totalMemory()));
        systemInfo.put("heapFreeMB", toMegabytes(runtime.freeMemory()));
        systemInfo.put("heapMaxMB", toMegabytes(runtime.maxMemory()));
        systemInfo.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());
        return systemInfo;
    }

    private long toMegabytes(long bytes) {
        return bytes / (1024 * 1024);
    }

    private Optional<String> resolveServiceName(String serviceName) {
        return discoveryClient.getServices().stream()
                .filter(registeredName -> registeredName.equalsIgnoreCase(serviceName))
                .findFirst();
    }
}
