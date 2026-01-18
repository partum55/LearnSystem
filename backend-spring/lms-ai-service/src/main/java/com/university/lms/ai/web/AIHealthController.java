package com.university.lms.ai.web;

import com.university.lms.ai.infrastructure.llm.AIGateway;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Health check controller for AI service and providers.
 */
@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
@Slf4j
public class AIHealthController implements HealthIndicator {

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    /**
     * AI service health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "lms-ai-service");

        // Add provider statuses
        Map<String, Object> providers = new HashMap<>();

        try {
            CircuitBreaker groqCb = circuitBreakerRegistry.circuitBreaker("groqProvider");
            providers.put("groq", Map.of(
                "circuitBreaker", groqCb.getState().name(),
                "failureRate", groqCb.getMetrics().getFailureRate(),
                "slowCallRate", groqCb.getMetrics().getSlowCallRate()
            ));
        } catch (Exception e) {
            providers.put("groq", Map.of("status", "NOT_CONFIGURED"));
        }

        try {
            CircuitBreaker openaiCb = circuitBreakerRegistry.circuitBreaker("openaiProvider");
            providers.put("openai", Map.of(
                "circuitBreaker", openaiCb.getState().name(),
                "failureRate", openaiCb.getMetrics().getFailureRate(),
                "slowCallRate", openaiCb.getMetrics().getSlowCallRate()
            ));
        } catch (Exception e) {
            providers.put("openai", Map.of("status", "NOT_CONFIGURED"));
        }

        health.put("providers", providers);

        return ResponseEntity.ok(health);
    }

    /**
     * Readiness probe - checks if AI service can handle requests.
     */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> readinessCheck() {
        Map<String, Object> ready = new HashMap<>();

        // Check if at least one provider is available
        boolean anyProviderAvailable = false;

        try {
            CircuitBreaker groqCb = circuitBreakerRegistry.circuitBreaker("groqProvider");
            if (groqCb.getState() != CircuitBreaker.State.OPEN) {
                anyProviderAvailable = true;
            }
        } catch (Exception ignored) {}

        try {
            CircuitBreaker openaiCb = circuitBreakerRegistry.circuitBreaker("openaiProvider");
            if (openaiCb.getState() != CircuitBreaker.State.OPEN) {
                anyProviderAvailable = true;
            }
        } catch (Exception ignored) {}

        if (anyProviderAvailable) {
            ready.put("status", "READY");
            return ResponseEntity.ok(ready);
        } else {
            ready.put("status", "NOT_READY");
            ready.put("reason", "All LLM providers unavailable");
            return ResponseEntity.status(503).body(ready);
        }
    }

    /**
     * Liveness probe - basic service alive check.
     */
    @GetMapping("/alive")
    public ResponseEntity<Map<String, String>> livenessCheck() {
        return ResponseEntity.ok(Map.of("status", "ALIVE"));
    }

    /**
     * Spring Boot Actuator health indicator for AI providers.
     */
    @Override
    public Health health() {
        try {
            boolean anyAvailable = false;
            Health.Builder builder = Health.up();

            // Check Groq provider
            try {
                CircuitBreaker groqCb = circuitBreakerRegistry.circuitBreaker("groqProvider");
                String state = groqCb.getState().name();
                builder.withDetail("groq.circuitBreaker", state);
                builder.withDetail("groq.failureRate", groqCb.getMetrics().getFailureRate());
                if (groqCb.getState() != CircuitBreaker.State.OPEN) {
                    anyAvailable = true;
                }
            } catch (Exception e) {
                builder.withDetail("groq.status", "NOT_CONFIGURED");
            }

            // Check OpenAI provider
            try {
                CircuitBreaker openaiCb = circuitBreakerRegistry.circuitBreaker("openaiProvider");
                String state = openaiCb.getState().name();
                builder.withDetail("openai.circuitBreaker", state);
                builder.withDetail("openai.failureRate", openaiCb.getMetrics().getFailureRate());
                if (openaiCb.getState() != CircuitBreaker.State.OPEN) {
                    anyAvailable = true;
                }
            } catch (Exception e) {
                builder.withDetail("openai.status", "NOT_CONFIGURED");
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

