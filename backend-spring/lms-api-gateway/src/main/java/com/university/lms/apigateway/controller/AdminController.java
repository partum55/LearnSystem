package com.university.lms.apigateway.controller;

import com.university.lms.apigateway.dto.ServiceStatusDto;
import com.university.lms.apigateway.dto.SystemHealthDto;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final DiscoveryClient discoveryClient;

    public AdminController(DiscoveryClient discoveryClient) {
        this.discoveryClient = discoveryClient;
    }

    @GetMapping("/services")
    public ResponseEntity<SystemHealthDto> getServicesHealth() {
        List<String> serviceNames = discoveryClient.getServices();
        List<ServiceStatusDto> services = new ArrayList<>();
        
        for (String serviceName : serviceNames) {
            List<ServiceInstance> instances = discoveryClient.getInstances(serviceName);
            for (ServiceInstance instance : instances) {
                // Service is registered in discovery, mark as UP
                // In production, consider implementing actual health check calls
                ServiceStatusDto status = new ServiceStatusDto(
                    serviceName,
                    instance.getInstanceId(),
                    "UP",
                    instance.getHost(),
                    instance.getPort(),
                    instance.getUri().toString() + "/actuator/health",
                    Instant.now()
                );
                services.add(status);
            }
        }
        
        int totalCount = services.size();
        int healthyCount = totalCount; // All registered services assumed UP
        int unhealthyCount = 0;
        String overallStatus = totalCount > 0 ? "HEALTHY" : "UNKNOWN";
        
        Map<String, Object> systemInfo = new HashMap<>();
        systemInfo.put("javaVersion", System.getProperty("java.version"));
        systemInfo.put("javaVendor", System.getProperty("java.vendor"));
        systemInfo.put("osName", System.getProperty("os.name"));
        systemInfo.put("osVersion", System.getProperty("os.version"));
        systemInfo.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        systemInfo.put("totalMemoryMB", Runtime.getRuntime().totalMemory() / (1024 * 1024));
        systemInfo.put("freeMemoryMB", Runtime.getRuntime().freeMemory() / (1024 * 1024));
        systemInfo.put("maxMemoryMB", Runtime.getRuntime().maxMemory() / (1024 * 1024));
        
        SystemHealthDto response = new SystemHealthDto(
            overallStatus,
            totalCount,
            healthyCount,
            unhealthyCount,
            services,
            systemInfo,
            Instant.now()
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/services/{serviceName}")
    public ResponseEntity<List<ServiceStatusDto>> getServiceInstances(@PathVariable String serviceName) {
        List<ServiceInstance> instances = discoveryClient.getInstances(serviceName);
        
        List<ServiceStatusDto> statuses = instances.stream()
            .map(instance -> new ServiceStatusDto(
                serviceName,
                instance.getInstanceId(),
                "UP",
                instance.getHost(),
                instance.getPort(),
                instance.getUri().toString() + "/actuator/health",
                Instant.now()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(statuses);
    }

    @GetMapping("/services/names")
    public ResponseEntity<List<String>> getServiceNames() {
        return ResponseEntity.ok(discoveryClient.getServices());
    }
}
