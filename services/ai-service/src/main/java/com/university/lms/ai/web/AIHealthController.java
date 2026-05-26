package com.university.lms.ai.web;

import com.university.lms.ai.service.AiProviderConfigService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Health check controller for the AI readiness service. */
@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
public class AIHealthController implements HealthIndicator {

  private final AiProviderConfigService providerConfigService;

  @GetMapping("/health")
  public ResponseEntity<Map<String, Object>> healthCheck() {
    return ResponseEntity.ok(status("UP"));
  }

  @GetMapping("/ready")
  public ResponseEntity<Map<String, Object>> readinessCheck() {
    return ResponseEntity.ok(status("READY"));
  }

  @GetMapping("/alive")
  public ResponseEntity<Map<String, Object>> livenessCheck() {
    return ResponseEntity.ok(status("ALIVE"));
  }

  @Override
  public Health health() {
    return Health.up()
        .withDetail("provider", providerConfigService.getDefaultProvider().name())
        .withDetail("aiFeaturesEnabled", providerConfigService.isAiFeaturesEnabled())
        .build();
  }

  private Map<String, Object> status(String status) {
    return Map.of(
        "status", status,
        "service", "lms-ai-service",
        "provider", providerConfigService.getDefaultProvider().name(),
        "aiFeaturesEnabled", providerConfigService.isAiFeaturesEnabled());
  }
}
