package com.university.lms.apigateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fallback endpoints used by gateway circuit breakers.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/ai")
    public Mono<ResponseEntity<Map<String, Object>>> aiFallback() {
        return serviceUnavailable(
                "AI Service Unavailable",
                "The AI service is temporarily unavailable. Please try again later.",
                "AI_SERVICE_UNAVAILABLE",
                30
        );
    }

    @GetMapping("/generic")
    public Mono<ResponseEntity<Map<String, Object>>> genericFallback() {
        return serviceUnavailable(
                "Service Unavailable",
                "The requested service is temporarily unavailable. Please try again later.",
                "SERVICE_UNAVAILABLE",
                null
        );
    }

    private Mono<ResponseEntity<Map<String, Object>>> serviceUnavailable(
            String error,
            String message,
            String code,
            Integer retryAfterSeconds
    ) {
        Map<String, Object> responseBody = new LinkedHashMap<>();
        responseBody.put("error", error);
        responseBody.put("message", message);
        responseBody.put("code", code);
        responseBody.put("timestamp", Instant.now().toString());
        if (retryAfterSeconds != null) {
            responseBody.put("retryAfter", retryAfterSeconds);
        }

        return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(responseBody));
    }
}
