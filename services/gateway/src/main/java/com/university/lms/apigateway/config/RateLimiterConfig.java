package com.university.lms.apigateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Key resolvers for gateway rate limiting.
 */
@Configuration
public class RateLimiterConfig {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String KEY_USER_PREFIX = "user:";
    private static final String KEY_IP_PREFIX = "ip:";
    private static final String UNKNOWN_CLIENT = "unknown";

    @Bean
    @Primary
    public KeyResolver userKeyResolver() {
        return exchange -> Mono.just(resolveClientKey(exchange.getRequest()));
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(resolveIpAddress(exchange.getRequest()));
    }

    private String resolveClientKey(ServerHttpRequest request) {
        String token = extractBearerToken(request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        if (token != null) {
            return KEY_USER_PREFIX + hashToken(token);
        }
        return KEY_IP_PREFIX + resolveIpAddress(request);
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            return null;
        }
        String token = authorizationHeader.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private String resolveIpAddress(ServerHttpRequest request) {
        String forwarded = request.getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        String realIp = request.getHeaders().getFirst("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        if (request.getRemoteAddress() == null || request.getRemoteAddress().getAddress() == null) {
            return UNKNOWN_CLIENT;
        }
        return request.getRemoteAddress().getAddress().getHostAddress();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return toHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            return Integer.toHexString(token.hashCode());
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value));
        }
        return builder.toString();
    }
}
