package com.university.lms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Account lockout service to prevent brute force attacks.
 * Uses Redis if available, falls back to in-memory for development.
 */
@Service
@Slf4j
public class AccountLockoutService {

    private static final String LOCKOUT_PREFIX = "account:lockout:";
    private static final String ATTEMPT_PREFIX = "account:attempts:";

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);
    private static final Duration ATTEMPT_WINDOW = Duration.ofMinutes(15);

    // Fallback in-memory storage
    private final Map<String, Integer> inMemoryAttempts = new ConcurrentHashMap<>();
    private final Map<String, Long> inMemoryLockouts = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private SecurityAuditLogger auditLogger;

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
                    log.info("Redis connection established - using Redis for account lockout");
                } catch (Exception e) {
                    log.warn("Redis not available - using in-memory account lockout for development");
                    useRedis = false;
                }
            } else {
                log.warn("RedisTemplate not configured - using in-memory account lockout");
                useRedis = false;
            }
        }
        return useRedis;
    }

    /**
     * Record a failed login attempt.
     *
     * @return true if account should be locked
     */
    public boolean recordFailedAttempt(String email, String ipAddress) {
        try {
            if (isRedisAvailable()) {
                return recordFailedAttemptRedis(email, ipAddress);
            } else {
                return recordFailedAttemptInMemory(email, ipAddress);
            }
        } catch (Exception e) {
            log.error("Error recording failed attempt: {}", e.getMessage());
            return false;
        }
    }

    private boolean recordFailedAttemptRedis(String email, String ipAddress) {
        String attemptKey = ATTEMPT_PREFIX + email;

        // Increment failed attempts
        Long attempts = redisTemplate.opsForValue().increment(attemptKey);

        if (attempts == null) {
            attempts = 1L;
        }

        // Set expiration for attempt counter
        if (attempts == 1) {
            redisTemplate.expire(attemptKey, ATTEMPT_WINDOW);
        }

        log.warn("Failed login attempt {} for email: {} from IP: {}", attempts, email, ipAddress);

        // Check if we should lock the account
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            lockAccount(email, ipAddress, attempts.intValue());
            return true;
        }

        return false;
    }

    private boolean recordFailedAttemptInMemory(String email, String ipAddress) {
        int attempts = inMemoryAttempts.compute(email, (k, v) -> (v == null) ? 1 : v + 1);

        log.warn("Failed login attempt {} for email: {} from IP: {} (in-memory)", attempts, email, ipAddress);

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            lockAccount(email, ipAddress, attempts);
            return true;
        }

        return false;
    }

    /**
     * Lock an account.
     */
    public void lockAccount(String email, String ipAddress, int failedAttempts) {
        try {
            if (isRedisAvailable()) {
                String lockoutKey = LOCKOUT_PREFIX + email;
                redisTemplate.opsForValue().set(lockoutKey, String.valueOf(System.currentTimeMillis()), LOCKOUT_DURATION);
            } else {
                inMemoryLockouts.put(email, System.currentTimeMillis() + LOCKOUT_DURATION.toMillis());
            }

            auditLogger.logAccountLockout(email, ipAddress, failedAttempts);
            log.warn("Account locked for email: {} after {} failed attempts", email, failedAttempts);
        } catch (Exception e) {
            log.error("Error locking account: {}", e.getMessage());
        }
    }

    /**
     * Check if an account is locked.
     */
    public boolean isAccountLocked(String email) {
        try {
            if (isRedisAvailable()) {
                String lockoutKey = LOCKOUT_PREFIX + email;
                return Boolean.TRUE.equals(redisTemplate.hasKey(lockoutKey));
            } else {
                Long lockoutTime = inMemoryLockouts.get(email);
                if (lockoutTime != null) {
                    if (System.currentTimeMillis() < lockoutTime) {
                        return true;
                    } else {
                        inMemoryLockouts.remove(email);
                    }
                }
                return false;
            }
        } catch (Exception e) {
            log.error("Error checking account lock status: {}", e.getMessage());
            // Fail secure - if we can't check, don't allow login
            return true;
        }
    }

    /**
     * Get remaining lockout time in seconds.
     */
    public long getRemainingLockoutTime(String email) {
        try {
            if (isRedisAvailable()) {
                String lockoutKey = LOCKOUT_PREFIX + email;
                Long ttl = redisTemplate.getExpire(lockoutKey, TimeUnit.SECONDS);
                return ttl != null && ttl > 0 ? ttl : 0;
            } else {
                Long lockoutTime = inMemoryLockouts.get(email);
                if (lockoutTime != null) {
                    long remaining = (lockoutTime - System.currentTimeMillis()) / 1000;
                    return Math.max(0, remaining);
                }
                return 0;
            }
        } catch (Exception e) {
            log.error("Error getting lockout time: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Clear failed attempts after successful login.
     */
    public void clearFailedAttempts(String email) {
        try {
            if (isRedisAvailable()) {
                String attemptKey = ATTEMPT_PREFIX + email;
                redisTemplate.delete(attemptKey);
            } else {
                inMemoryAttempts.remove(email);
            }
        } catch (Exception e) {
            log.error("Error clearing failed attempts: {}", e.getMessage());
        }
    }

    /**
     * Manually unlock an account (admin action).
     */
    public void unlockAccount(String email) {
        try {
            if (isRedisAvailable()) {
                String lockoutKey = LOCKOUT_PREFIX + email;
                String attemptKey = ATTEMPT_PREFIX + email;
                redisTemplate.delete(lockoutKey);
                redisTemplate.delete(attemptKey);
            } else {
                inMemoryLockouts.remove(email);
                inMemoryAttempts.remove(email);
            }
            log.info("Account manually unlocked for email: {}", email);
        } catch (Exception e) {
            log.error("Error unlocking account: {}", e.getMessage());
        }
    }

    /**
     * Get current failed attempt count.
     */
    public int getFailedAttemptCount(String email) {
        try {
            if (isRedisAvailable()) {
                String attemptKey = ATTEMPT_PREFIX + email;
                String count = redisTemplate.opsForValue().get(attemptKey);
                return count != null ? Integer.parseInt(count) : 0;
            } else {
                return inMemoryAttempts.getOrDefault(email, 0);
            }
        } catch (Exception e) {
            log.error("Error getting failed attempt count: {}", e.getMessage());
            return 0;
        }
    }
}

