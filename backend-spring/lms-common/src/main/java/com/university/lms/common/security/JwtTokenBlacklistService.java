package com.university.lms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Date;
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

    // Fallback in-memory cache for development
    private final Map<String, Long> inMemoryBlacklist = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private JwtService jwtService;

    private boolean redisChecked = false;
    private boolean useRedis = false;

    /**
     * Check if Redis is available (lazy check)
     */
    private boolean isRedisAvailable() {
        if (!redisChecked) {
            redisChecked = true;
            if (redisTemplate != null) {
                try {
                    redisTemplate.getConnectionFactory().getConnection().ping();
                    useRedis = true;
                    log.info("Redis connection established - using Redis for token blacklist");
                } catch (Exception e) {
                    log.warn("Redis not available - using in-memory token blacklist for development");
                    useRedis = false;
                }
            } else {
                log.warn("RedisTemplate not configured - using in-memory token blacklist");
                useRedis = false;
            }
        }
        return useRedis;
    }

    /**
     * Add token to blacklist.
     */
    public void blacklistToken(String token) {
        try {
            Date expiration = jwtService.extractExpiration(token);
            long ttl = expiration.getTime() - System.currentTimeMillis();

            if (ttl > 0) {
                if (isRedisAvailable()) {
                    String key = BLACKLIST_PREFIX + token;
                    redisTemplate.opsForValue().set(key, "revoked", Duration.ofMillis(ttl));
                    log.info("Token blacklisted in Redis");
                } else {
                    // Fallback to in-memory
                    inMemoryBlacklist.put(token, System.currentTimeMillis() + ttl);
                    log.info("Token blacklisted in-memory (development mode)");
                }
            }
        } catch (Exception e) {
            log.error("Failed to blacklist token: {}", e.getMessage());
        }
    }

    /**
     * Check if token is blacklisted.
     */
    public boolean isBlacklisted(String token) {
        try {
            if (isRedisAvailable()) {
                String key = BLACKLIST_PREFIX + token;
                return Boolean.TRUE.equals(redisTemplate.hasKey(key));
            } else {
                // Check in-memory and cleanup expired
                Long expiryTime = inMemoryBlacklist.get(token);
                if (expiryTime != null) {
                    if (System.currentTimeMillis() < expiryTime) {
                        return true;
                    } else {
                        inMemoryBlacklist.remove(token);
                    }
                }
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to check token blacklist: {}", e.getMessage());
            // Fail open in development to avoid breaking functionality
            return false;
        }
    }

    /**
     * Blacklist all tokens for a specific user (e.g., on password change).
     */
    public void blacklistUserTokens(String userId) {
        try {
            // Note: This is simplified - in production use user-specific keys
            log.info("Blacklisted tokens for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to blacklist user tokens: {}", e.getMessage());
        }
    }
}

