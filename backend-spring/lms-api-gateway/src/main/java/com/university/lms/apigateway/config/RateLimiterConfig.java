package com.university.lms.apigateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

/**
 * Rate limiting configuration for API Gateway.
 */
@Configuration
public class RateLimiterConfig {

    /**
     * Key resolver that extracts user identity for rate limiting.
     * Falls back to IP address if no user identity is available.
     */
    @Bean
    @Primary
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // Try to get user from JWT header (simplified - in production, decode JWT)
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                // Use a hash of the token as the key (simplified)
                String token = authHeader.substring(7);
                return Mono.just("user:" + token.hashCode());
            }

            // Fall back to IP address
            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "anonymous";

            return Mono.just("ip:" + ip);
        };
    }

    /**
     * Key resolver based on IP address only.
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "0.0.0.0";
            return Mono.just(ip);
        };
    }
}

