package com.university.lms.common.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Token Bucket algorithm.
 * Prevents brute force attacks and API abuse.
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // Different rate limits for different endpoint types
    private static final Map<String, RateLimit> RATE_LIMITS = Map.of(
            "/auth/login", new RateLimit(5, Duration.ofMinutes(15)),      // 5 attempts per 15 min
            "/auth/register", new RateLimit(3, Duration.ofHours(1)),      // 3 attempts per hour
            "/auth/forgot-password", new RateLimit(3, Duration.ofHours(1)),
            "/auth/reset-password", new RateLimit(3, Duration.ofHours(1)),
            "default", new RateLimit(100, Duration.ofMinutes(1))          // 100 requests per minute
    );

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String clientId = getClientIdentifier(request);
        String endpoint = getEndpointKey(request);

        Bucket bucket = resolveBucket(clientId, endpoint);

        if (bucket.tryConsume(1)) {
            // Request allowed
            filterChain.doFilter(request, response);
        } else {
            // Rate limit exceeded
            log.warn("Rate limit exceeded for client: {} on endpoint: {}", clientId, endpoint);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
        }
    }

    private Bucket resolveBucket(String clientId, String endpoint) {
        String key = clientId + ":" + endpoint;
        return cache.computeIfAbsent(key, k -> createBucket(endpoint));
    }

    private Bucket createBucket(String endpoint) {
        RateLimit rateLimit = RATE_LIMITS.getOrDefault(endpoint, RATE_LIMITS.get("default"));

        Bandwidth limit = Bandwidth.classic(
                rateLimit.capacity,
                Refill.intervally(rateLimit.capacity, rateLimit.duration)
        );

        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private String getClientIdentifier(HttpServletRequest request) {
        // Try to get authenticated user
        String userId = (String) request.getAttribute("userId");
        if (userId != null) {
            return "user:" + userId;
        }

        // Fallback to IP address
        String ip = getClientIP(request);
        return "ip:" + ip;
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }

        return request.getRemoteAddr();
    }

    private String getEndpointKey(HttpServletRequest request) {
        String uri = request.getRequestURI();

        // Check for specific rate-limited endpoints
        for (String endpoint : RATE_LIMITS.keySet()) {
            if (uri.contains(endpoint)) {
                return endpoint;
            }
        }

        return "default";
    }

    private static class RateLimit {
        final long capacity;
        final Duration duration;

        RateLimit(long capacity, Duration duration) {
            this.capacity = capacity;
            this.duration = duration;
        }
    }
}

