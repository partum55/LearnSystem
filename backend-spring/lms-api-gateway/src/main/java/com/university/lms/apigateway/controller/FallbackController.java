package com.university.lms.apigateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

/**
 * Fallback controller for circuit breaker responses.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    /**
     * Fallback for AI service when circuit breaker is open.
     */
    @GetMapping("/ai")
    public Mono<ResponseEntity<Map<String, Object>>> aiFallback() {
        return Mono.just(ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "AI Service Unavailable",
                        "message", "The AI service is temporarily unavailable. Please try again later.",
                        "code", "AI_SERVICE_UNAVAILABLE",
                        "timestamp", Instant.now().toString(),
                        "retryAfter", 30
                )));
    }

    /**
     * Generic fallback for any service.
     */
    @GetMapping("/generic")
    public Mono<ResponseEntity<Map<String, Object>>> genericFallback() {
        return Mono.just(ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "error", "Service Unavailable",
                        "message", "The requested service is temporarily unavailable. Please try again later.",
                        "code", "SERVICE_UNAVAILABLE",
                        "timestamp", Instant.now().toString()
                )));
    }
}

