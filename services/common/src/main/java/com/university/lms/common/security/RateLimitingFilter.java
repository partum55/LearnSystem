package com.university.lms.common.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Token Bucket algorithm.
 * Prevents brute force attacks and API abuse.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final String DEFAULT_ENDPOINT = "default";
    private static final int MAX_BUCKET_CACHE_SIZE = 100_000;

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();
    private final SecurityAuditLogger auditLogger;

    private static final Map<String, RateLimit> RATE_LIMITS = Map.of(
            "/auth/login", new RateLimit(50, Duration.ofMinutes(1)),
            "/auth/register", new RateLimit(20, Duration.ofMinutes(1)),
            "/auth/forgot-password", new RateLimit(10, Duration.ofMinutes(1)),
            "/auth/reset-password", new RateLimit(10, Duration.ofMinutes(1)),
            DEFAULT_ENDPOINT, new RateLimit(200, Duration.ofMinutes(1))
    );

    private static final List<String> ENDPOINT_PRIORITY = List.of(
            "/auth/login",
            "/auth/register",
            "/auth/forgot-password",
            "/auth/reset-password"
    );

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientId = getClientIdentifier(request);
        String endpoint = getEndpointKey(request);

        Bucket bucket = resolveBucket(clientId, endpoint);
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimit rateLimit = RATE_LIMITS.getOrDefault(endpoint, RATE_LIMITS.get(DEFAULT_ENDPOINT));
        long retryAfterSeconds = Math.max(1, rateLimit.duration.toSeconds());

        log.warn("Rate limit exceeded for client '{}' on endpoint '{}'", clientId, endpoint);
        auditLogger.logRateLimitExceeded(clientId, endpoint);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
        response.getWriter()
                .write("{\"code\":\"RATE_LIMITED\",\"message\":\"Too many requests. Please try again later.\"}");
    }

    private Bucket resolveBucket(String clientId, String endpoint) {
        if (cache.size() > MAX_BUCKET_CACHE_SIZE) {
            cache.clear();
            log.warn("Rate limit bucket cache exceeded {} entries and was cleared", MAX_BUCKET_CACHE_SIZE);
        }

        String key = clientId + ":" + endpoint;
        return cache.computeIfAbsent(key, ignored -> createBucket(endpoint));
    }

    private Bucket createBucket(String endpoint) {
        RateLimit rateLimit = RATE_LIMITS.getOrDefault(endpoint, RATE_LIMITS.get(DEFAULT_ENDPOINT));
        Bandwidth limit = Bandwidth.classic(
                rateLimit.capacity,
                Refill.intervally(rateLimit.capacity, rateLimit.duration)
        );

        return Bucket.builder().addLimit(limit).build();
    }

    private String getClientIdentifier(HttpServletRequest request) {
        Object userIdObj = request.getAttribute("userId");
        if (userIdObj != null) {
            return "user:" + userIdObj;
        }
        return "ip:" + getClientIP(request);
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isBlank()) {
            return xRealIP;
        }

        return request.getRemoteAddr();
    }

    private String getEndpointKey(HttpServletRequest request) {
        String uri = normalizeApiPath(request.getRequestURI());
        for (String endpoint : ENDPOINT_PRIORITY) {
            if (uri.equals("/api" + endpoint) || uri.startsWith("/api" + endpoint + "/")) {
                return endpoint;
            }
        }
        return DEFAULT_ENDPOINT;
    }

    private String normalizeApiPath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        if (path.startsWith("/api/v1/")) {
            return "/api/" + path.substring("/api/v1/".length());
        }
        return path;
    }

    private record RateLimit(long capacity, Duration duration) {
    }
}
