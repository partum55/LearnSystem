package com.university.lms.apigateway.controller;

import com.university.lms.apigateway.dto.ServiceStatusDto;
import com.university.lms.apigateway.dto.SystemHealthDto;
import jakarta.validation.constraints.NotBlank;
import java.io.IOException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.Duration;
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
    private static final String STATUS_DOWN = "DOWN";
    private static final String STATUS_UNKNOWN = "UNKNOWN";
    private static final String OVERALL_HEALTHY = "HEALTHY";
    private static final String OVERALL_UNKNOWN = "UNKNOWN";
    private static final Duration HEALTH_TIMEOUT = Duration.ofSeconds(3);

    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(HEALTH_TIMEOUT).build();

    @Value("${USER_SERVICE_URL:http://localhost:8081}")
    private String userServiceUrl;

    @Value("${LEARNING_SERVICE_URL:http://localhost:8089}")
    private String learningServiceUrl;

    @Value("${AI_SERVICE_URL:http://localhost:8085}")
    private String aiServiceUrl;

    @Value("${EXECUTION_SERVICE_URL:http://localhost:3000}")
    private String executionServiceUrl;

    @Value("${GATEWAY_PUBLIC_URL:http://localhost:8080}")
    private String gatewayUrl;

    @GetMapping("/services")
    public ResponseEntity<SystemHealthDto> getServicesHealth() {
        Instant now = Instant.now();
        List<ServiceStatusDto> services = serviceTargets().stream()
                .map(target -> toServiceStatus(target, now))
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
        Instant now = Instant.now();
        List<ServiceStatusDto> statuses = resolveServiceName(serviceName)
                .map(target -> List.of(toServiceStatus(target, now)))
                .orElse(List.of());
        return ResponseEntity.ok(statuses);
    }

    @GetMapping("/services/names")
    public ResponseEntity<List<String>> getServiceNames() {
        List<String> serviceNames = serviceTargets().stream()
                .map(ServiceTarget::serviceName)
                .sorted()
                .toList();
        return ResponseEntity.ok(serviceNames);
    }

    private ServiceStatusDto toServiceStatus(ServiceTarget target, Instant now) {
        URI serviceUri = URI.create(target.baseUrl());
        int port = serviceUri.getPort() > 0 ? serviceUri.getPort() : defaultPort(serviceUri.getScheme());
        String host = serviceUri.getHost() == null ? "unknown" : serviceUri.getHost();
        String status = probeHealth(target.healthUrl());
        String instanceId = target.serviceName() + ":" + host + ":" + port;

        return new ServiceStatusDto(
                target.serviceName(),
                instanceId,
                status,
                host,
                port,
                target.healthUrl(),
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

    private Optional<ServiceTarget> resolveServiceName(String serviceName) {
        return serviceTargets().stream()
                .filter(target -> target.serviceName().equalsIgnoreCase(serviceName))
                .findFirst();
    }

    private List<ServiceTarget> serviceTargets() {
        return List.of(
                new ServiceTarget("api-gateway", gatewayUrl, gatewayUrl + "/actuator/health"),
                new ServiceTarget("user-service", userServiceUrl, userServiceUrl + "/api/actuator/health"),
                new ServiceTarget("learning-service", learningServiceUrl, learningServiceUrl + "/api/actuator/health"),
                new ServiceTarget("ai-service", aiServiceUrl, aiServiceUrl + "/api/actuator/health"),
                new ServiceTarget("execution-service", executionServiceUrl, executionServiceUrl + "/health"));
    }

    private String probeHealth(String healthUrl) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(healthUrl))
                .timeout(HEALTH_TIMEOUT)
                .GET()
                .build();
        try {
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            return response.statusCode() >= 200 && response.statusCode() < 300 ? STATUS_UP : STATUS_DOWN;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return STATUS_UNKNOWN;
        }
    }

    private int defaultPort(String scheme) {
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private record ServiceTarget(String serviceName, String baseUrl, String healthUrl) {}
}
