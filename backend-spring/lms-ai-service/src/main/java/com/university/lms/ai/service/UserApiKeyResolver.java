package com.university.lms.ai.service;

import com.university.lms.ai.config.LlamaApiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class UserApiKeyResolver {

    private static final String CACHE_PREFIX = "user-api-key:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    private final WebClient userServiceClient;
    private final StringRedisTemplate redisTemplate;
    private final LlamaApiProperties llamaApiProperties;
    private final String internalToken;

    public UserApiKeyResolver(
            @Value("${services.user-service.url:http://localhost:8081}") String userServiceUrl,
            @Value("${security.internal-token:}") String internalToken,
            StringRedisTemplate redisTemplate,
            LlamaApiProperties llamaApiProperties) {
        this.userServiceClient = WebClient.create(userServiceUrl + "/api");
        this.internalToken = internalToken;
        this.redisTemplate = redisTemplate;
        this.llamaApiProperties = llamaApiProperties;
    }

    public String resolveApiKey(UUID userId, String userRole) {
        // SUPERADMIN uses system key
        if ("SUPERADMIN".equals(userRole)) {
            return llamaApiProperties.getKey();
        }

        String cacheKey = CACHE_PREFIX + userId + ":GROQ";

        // Check Redis cache
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return cached;
            }
        } catch (Exception e) {
            log.warn("Redis cache read failed, fetching from user-service: {}", e.getMessage());
        }

        // Fetch from user-service
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> response = userServiceClient.get()
                    .uri("/internal/api-keys/{userId}/GROQ", userId)
                    .header(INTERNAL_TOKEN_HEADER, internalToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(5));

            if (response != null && response.containsKey("apiKey")) {
                String apiKey = response.get("apiKey");
                // Cache in Redis
                try {
                    redisTemplate.opsForValue().set(cacheKey, apiKey, CACHE_TTL);
                } catch (Exception e) {
                    log.warn("Redis cache write failed: {}", e.getMessage());
                }
                return apiKey;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch API key from user-service for user {}: {}", userId, e.getMessage());
        }

        return null;
    }

    public void evictCache(UUID userId) {
        try {
            redisTemplate.delete(CACHE_PREFIX + userId + ":GROQ");
        } catch (Exception e) {
            log.warn("Failed to evict API key cache: {}", e.getMessage());
        }
    }
}
