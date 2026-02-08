package com.university.lms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JWT token blacklist service.
 * Uses Redis if available, falls back to in-memory for development.
 */
@Service
@Slf4j
public class JwtTokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";
    private static final String REVOKED_MARKER = "revoked";
    private static final int MAX_IN_MEMORY_ENTRIES = 50_000;
    private static final long CLEANUP_INTERVAL_MILLIS = Duration.ofMinutes(5).toMillis();

    private final Map<String, Long> inMemoryBlacklist = new ConcurrentHashMap<>();
    private final ObjectProvider<RedisTemplate<String, String>> redisTemplateProvider;
    private final JwtService jwtService;

    private volatile boolean redisChecked;
    private volatile boolean redisAvailable;
    private volatile RedisTemplate<String, String> redisTemplate;
    private volatile long lastCleanupAtMillis;

    public JwtTokenBlacklistService(
            ObjectProvider<RedisTemplate<String, String>> redisTemplateProvider,
            JwtService jwtService) {
        this.redisTemplateProvider = redisTemplateProvider;
        this.jwtService = jwtService;
    }

    /**
     * Check if Redis is available (lazy check).
     */
    private boolean isRedisAvailable() {
        if (redisChecked) {
            return redisAvailable;
        }

        synchronized (this) {
            if (!redisChecked) {
                redisTemplate = redisTemplateProvider.getIfAvailable();
                if (redisTemplate != null) {
                    try {
                        String ping = redisTemplate.execute((RedisCallback<String>) connection -> connection.ping());
                        redisAvailable = "PONG".equalsIgnoreCase(ping);
                        if (redisAvailable) {
                            log.info("Redis connection established - using Redis for token blacklist");
                        } else {
                            log.warn("Redis ping returned unexpected response - using in-memory token blacklist");
                        }
                    } catch (Exception e) {
                        redisAvailable = false;
                        log.warn("Redis not available - using in-memory token blacklist");
                    }
                } else {
                    redisAvailable = false;
                    log.warn("RedisTemplate not configured - using in-memory token blacklist");
                }
                redisChecked = true;
            }
        }

        return redisAvailable;
    }

    /**
     * Add token to blacklist.
     */
    public void blacklistToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        try {
            String tokenKey = tokenKey(token);
            Date expiration = jwtService.extractExpiration(token);
            long ttl = expiration.getTime() - System.currentTimeMillis();
            if (ttl <= 0) {
                return;
            }

            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    template.opsForValue().set(redisKey(tokenKey), REVOKED_MARKER, Duration.ofMillis(ttl));
                    log.debug("Token blacklisted in Redis");
                    return;
                }
            }

            cleanupInMemoryIfNeeded();
            inMemoryBlacklist.put(tokenKey, System.currentTimeMillis() + ttl);
            log.debug("Token blacklisted in-memory");
        } catch (Exception e) {
            log.warn("Failed to blacklist token: {}", e.getMessage());
        }
    }

    /**
     * Check if token is blacklisted.
     */
    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            String tokenKey = tokenKey(token);
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    return Boolean.TRUE.equals(template.hasKey(redisKey(tokenKey)));
                }
            }
            cleanupInMemoryIfNeeded();
            return isBlacklistedInMemory(tokenKey);
        } catch (Exception e) {
            log.warn("Failed to check token blacklist: {}", e.getMessage());
            return false;
        }
    }

    private boolean isBlacklistedInMemory(String token) {
        Long expiryTime = inMemoryBlacklist.get(token);
        if (expiryTime == null) {
            return false;
        }
        if (System.currentTimeMillis() < expiryTime) {
            return true;
        }
        inMemoryBlacklist.remove(token);
        return false;
    }

    private String redisKey(String tokenKey) {
        return BLACKLIST_PREFIX + tokenKey;
    }

    private String tokenKey(String token) {
        return hashToken(token.trim());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            // Fallback: use raw token if hashing is unavailable.
            return token;
        }
    }

    /**
     * Blacklist all tokens for a specific user (e.g., on password change).
     */
    public void blacklistUserTokens(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        // Tokens are stateless and not currently indexed by user.
        log.info("Requested token revocation for user {}", userId);
    }

    private void cleanupInMemoryIfNeeded() {
        long now = System.currentTimeMillis();
        boolean shouldCleanupByTime = now - lastCleanupAtMillis >= CLEANUP_INTERVAL_MILLIS;
        boolean shouldCleanupBySize = inMemoryBlacklist.size() > MAX_IN_MEMORY_ENTRIES;
        if (!shouldCleanupByTime && !shouldCleanupBySize) {
            return;
        }

        inMemoryBlacklist.entrySet().removeIf(entry -> entry.getValue() <= now);

        int overflow = inMemoryBlacklist.size() - MAX_IN_MEMORY_ENTRIES;
        if (overflow > 0) {
            for (String key : inMemoryBlacklist.keySet()) {
                if (overflow-- <= 0) {
                    break;
                }
                inMemoryBlacklist.remove(key);
            }
            log.warn("Token blacklist in-memory cache exceeded limit and was pruned");
        }

        lastCleanupAtMillis = now;
    }
}
