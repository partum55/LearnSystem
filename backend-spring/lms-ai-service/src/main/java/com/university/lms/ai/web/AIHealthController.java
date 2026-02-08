package com.university.lms.ai.web;

import com.university.lms.ai.infrastructure.llm.AIGateway;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Health check controller for AI service and providers. */
@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
@Slf4j
public class AIHealthController implements HealthIndicator {

  private final AIGateway aiGateway;

  /** AI service health check endpoint. */
  @GetMapping("/health")
  public ResponseEntity<Map<String, Object>> healthCheck() {
    List<AIGateway.ProviderStatus> statuses = aiGateway.getProvidersStatus();
    Map<String, Object> providers = new LinkedHashMap<>();
    for (AIGateway.ProviderStatus status : statuses) {
      providers.put(
          status.name(),
          Map.of(
              "available", status.available(),
              "circuitBreaker", status.circuitBreakerState(),
              "health", status.health(),
              "priority", status.priority()));
    }

    boolean anyProviderAvailable =
        statuses.stream()
            .anyMatch(status -> status.available() && !"OPEN".equals(status.circuitBreakerState()));

    Map<String, Object> health = new LinkedHashMap<>();
    health.put("status", anyProviderAvailable ? "UP" : "DEGRADED");
    health.put("service", "lms-ai-service");
    health.put("providers", providers);

    return anyProviderAvailable
        ? ResponseEntity.ok(health)
        : ResponseEntity.status(503).body(health);
  }

  /** Readiness probe - checks if AI service can handle requests. */
  @GetMapping("/ready")
  public ResponseEntity<Map<String, Object>> readinessCheck() {
    List<AIGateway.ProviderStatus> statuses = aiGateway.getProvidersStatus();
    boolean anyProviderAvailable =
        statuses.stream()
            .anyMatch(status -> status.available() && !"OPEN".equals(status.circuitBreakerState()));

    if (anyProviderAvailable) {
      return ResponseEntity.ok(Map.of("status", "READY"));
    }
    return ResponseEntity.status(503)
        .body(
            Map.of(
                "status", "NOT_READY",
                "reason", "All LLM providers unavailable"));
  }

  /** Liveness probe - basic service alive check. */
  @GetMapping("/alive")
  public ResponseEntity<Map<String, String>> livenessCheck() {
    return ResponseEntity.ok(Map.of("status", "ALIVE"));
  }

  /** Spring Boot Actuator health indicator for AI providers. */
  @Override
  public Health health() {
    try {
      List<AIGateway.ProviderStatus> statuses = aiGateway.getProvidersStatus();
      boolean anyAvailable = false;
      Health.Builder builder = Health.up();

      for (AIGateway.ProviderStatus status : statuses) {
        builder.withDetail(status.name() + ".available", status.available());
        builder.withDetail(status.name() + ".health", status.health());
        builder.withDetail(status.name() + ".circuitBreaker", status.circuitBreakerState());
        if (status.available() && !"OPEN".equals(status.circuitBreakerState())) {
          anyAvailable = true;
        }
      }

      if (!anyAvailable) {
        return builder.down().withDetail("reason", "All LLM providers unavailable").build();
      }

      return builder.build();

    } catch (Exception e) {
      return Health.down().withException(e).build();
    }
  }
}
