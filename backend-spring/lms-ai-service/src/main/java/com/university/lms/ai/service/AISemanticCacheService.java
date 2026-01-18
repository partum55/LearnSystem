package com.university.lms.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.infrastructure.llm.LLMGenerationOptions;
import com.university.lms.ai.infrastructure.llm.LLMResponse;
import com.university.lms.ai.infrastructure.metrics.AIMetricsCollector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Semantic caching service for AI responses using Redis.
 * Caches responses based on prompt hash to avoid redundant LLM calls.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AISemanticCacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final AIMetricsCollector metricsCollector;

    private static final String CACHE_PREFIX = "ai:cache:";

    @Value("${ai.cache.enabled:true}")
    private boolean cacheEnabled;

    @Value("${ai.cache.ttl-minutes:60}")
    private int cacheTtlMinutes;

    @Value("${ai.cache.max-tokens-to-cache:8000}")
    private int maxTokensToCache;

    /**
     * Try to get a cached response for the given prompt.
     *
     * @param prompt       User prompt
     * @param systemPrompt System prompt
     * @param options      Generation options (affects cache key)
     * @return Cached response if available
     */
    public Optional<LLMResponse> get(String prompt, String systemPrompt, LLMGenerationOptions options) {
        if (!cacheEnabled) {
            return Optional.empty();
        }

        String cacheKey = generateCacheKey(prompt, systemPrompt, options);

        try {
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);

            if (cachedJson != null) {
                LLMResponse response = objectMapper.readValue(cachedJson, LLMResponse.class);
                response.setCached(true);

                metricsCollector.recordCacheAccess(options.getGenerationType(), true);
                log.debug("Cache hit for prompt hash: {}", cacheKey.substring(CACHE_PREFIX.length()));

                return Optional.of(response);
            }

            metricsCollector.recordCacheAccess(options.getGenerationType(), false);
            log.debug("Cache miss for prompt hash: {}", cacheKey.substring(CACHE_PREFIX.length()));

        } catch (Exception e) {
            log.warn("Error reading from cache: {}", e.getMessage());
            metricsCollector.recordCacheAccess(options.getGenerationType(), false);
        }

        return Optional.empty();
    }

    /**
     * Cache a response for the given prompt.
     *
     * @param prompt       User prompt
     * @param systemPrompt System prompt
     * @param options      Generation options
     * @param response     Response to cache
     */
    public void put(String prompt, String systemPrompt, LLMGenerationOptions options, LLMResponse response) {
        if (!cacheEnabled) {
            return;
        }

        // Don't cache very large responses
        if (response.getTotalTokens() > maxTokensToCache) {
            log.debug("Response too large to cache: {} tokens", response.getTotalTokens());
            return;
        }

        String cacheKey = generateCacheKey(prompt, systemPrompt, options);

        try {
            String json = objectMapper.writeValueAsString(response);
            redisTemplate.opsForValue().set(
                    cacheKey,
                    json,
                    Duration.ofMinutes(cacheTtlMinutes)
            );

            log.debug("Cached response with key: {}, TTL: {} minutes",
                    cacheKey.substring(CACHE_PREFIX.length()), cacheTtlMinutes);

        } catch (JsonProcessingException e) {
            log.warn("Error serializing response for cache: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("Error writing to cache: {}", e.getMessage());
        }
    }

    /**
     * Invalidate cached response for a prompt.
     */
    public void invalidate(String prompt, String systemPrompt, LLMGenerationOptions options) {
        if (!cacheEnabled) {
            return;
        }

        String cacheKey = generateCacheKey(prompt, systemPrompt, options);
        redisTemplate.delete(cacheKey);
        log.debug("Invalidated cache key: {}", cacheKey.substring(CACHE_PREFIX.length()));
    }

    /**
     * Clear all AI caches.
     */
    public void clearAll() {
        var keys = redisTemplate.keys(CACHE_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.info("Cleared {} AI cache entries", keys.size());
        }
    }

    /**
     * Get cache statistics.
     */
    public CacheStats getStats() {
        var keys = redisTemplate.keys(CACHE_PREFIX + "*");
        int count = keys != null ? keys.size() : 0;
        return new CacheStats(count, cacheEnabled, cacheTtlMinutes);
    }

    /**
     * Generate a unique cache key based on prompt and options.
     */
    private String generateCacheKey(String prompt, String systemPrompt, LLMGenerationOptions options) {
        String combined = String.format("%s|%s|%.2f|%d",
                systemPrompt != null ? systemPrompt : "",
                prompt,
                options.getTemperature(),
                options.getMaxTokens()
        );

        return CACHE_PREFIX + hashString(combined);
    }

    private String hashString(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(input.hashCode());
        }
    }

    public record CacheStats(int entryCount, boolean enabled, int ttlMinutes) {}
}

