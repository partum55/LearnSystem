package com.university.lms.ai.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/** Service for caching AI generation results to reduce API calls and costs */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIGenerationCacheService {

  private final RedisTemplate<String, String> redisTemplate;

  private static final String CACHE_PREFIX = "ai:generation:";
  private static final Duration DEFAULT_TTL = Duration.ofHours(24);
  private static final Duration LONG_TTL = Duration.ofDays(7);

  /** Get cached result by prompt */
  public Optional<String> getCached(String prompt) {
    try {
      String key = buildKey(prompt);
      String cached = redisTemplate.opsForValue().get(key);

      if (cached != null) {
        log.info("Cache HIT for prompt hash: {}", hashPrompt(prompt).substring(0, 8));
        return Optional.of(cached);
      }

      log.debug("Cache MISS for prompt hash: {}", hashPrompt(prompt).substring(0, 8));
      return Optional.empty();

    } catch (Exception e) {
      log.error("Error getting from cache", e);
      return Optional.empty();
    }
  }

  /** Cache AI generation result */
  public void cache(String prompt, String result) {
    cache(prompt, result, DEFAULT_TTL);
  }

  /** Cache with custom TTL */
  public void cache(String prompt, String result, Duration ttl) {
    try {
      String key = buildKey(prompt);
      redisTemplate.opsForValue().set(key, result, ttl);
      log.info(
          "Cached result for prompt hash: {} (TTL: {}h)",
          hashPrompt(prompt).substring(0, 8),
          ttl.toHours());
    } catch (Exception e) {
      log.error("Error caching result", e);
    }
  }

  /** Cache with long TTL for high-quality results */
  public void cacheLongTerm(String prompt, String result) {
    cache(prompt, result, LONG_TTL);
  }

  /** Invalidate cache for specific prompt */
  public void invalidate(String prompt) {
    try {
      String key = buildKey(prompt);
      redisTemplate.delete(key);
      log.info("Invalidated cache for prompt hash: {}", hashPrompt(prompt).substring(0, 8));
    } catch (Exception e) {
      log.error("Error invalidating cache", e);
    }
  }

  /** Clear all AI generation cache */
  public void clearAll() {
    try {
      var keys = redisTemplate.keys(CACHE_PREFIX + "*");
      if (keys != null && !keys.isEmpty()) {
        redisTemplate.delete(keys);
        log.info("Cleared {} cache entries", keys.size());
      }
    } catch (Exception e) {
      log.error("Error clearing cache", e);
    }
  }

  /** Get cache statistics */
  public CacheStats getStats() {
    try {
      var keys = redisTemplate.keys(CACHE_PREFIX + "*");
      int totalEntries = keys != null ? keys.size() : 0;

      return CacheStats.builder()
          .totalEntries(totalEntries)
          .cachePrefix(CACHE_PREFIX)
          .defaultTtlHours(DEFAULT_TTL.toHours())
          .build();
    } catch (Exception e) {
      log.error("Error getting cache stats", e);
      return CacheStats.builder().totalEntries(0).build();
    }
  }

  /** Build cache key from prompt */
  private String buildKey(String prompt) {
    return CACHE_PREFIX + hashPrompt(prompt);
  }

  /** Hash prompt using SHA-256 */
  private String hashPrompt(String prompt) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(prompt.getBytes(StandardCharsets.UTF_8));
      return bytesToHex(hash);
    } catch (NoSuchAlgorithmException e) {
      log.error("SHA-256 algorithm not available", e);
      return String.valueOf(prompt.hashCode());
    }
  }

  /** Convert bytes to hex string */
  private String bytesToHex(byte[] bytes) {
    StringBuilder result = new StringBuilder();
    for (byte b : bytes) {
      result.append(String.format("%02x", b));
    }
    return result.toString();
  }

  /** Cache statistics DTO */
  @lombok.Data
  @lombok.Builder
  public static class CacheStats {
    private int totalEntries;
    private String cachePrefix;
    private long defaultTtlHours;
  }
}
