package com.university.lms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Account lockout service to prevent brute-force attacks.
 * Uses Redis when available and an in-memory fallback for local development.
 */
@Service
@Slf4j
public class AccountLockoutService {

    private static final String LOCKOUT_PREFIX = "account:lockout:";
    private static final String ATTEMPT_PREFIX = "account:attempts:";

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);
    private static final Duration ATTEMPT_WINDOW = Duration.ofMinutes(15);

    private final Map<String, Integer> inMemoryAttempts = new ConcurrentHashMap<>();
    private final Map<String, Long> inMemoryAttemptStart = new ConcurrentHashMap<>();
    private final Map<String, Long> inMemoryLockouts = new ConcurrentHashMap<>();

    private final ObjectProvider<RedisTemplate<String, String>> redisTemplateProvider;
    private final SecurityAuditLogger auditLogger;

    private volatile boolean redisChecked;
    private volatile boolean redisAvailable;
    private volatile RedisTemplate<String, String> redisTemplate;

    public AccountLockoutService(
            ObjectProvider<RedisTemplate<String, String>> redisTemplateProvider,
            SecurityAuditLogger auditLogger) {
        this.redisTemplateProvider = redisTemplateProvider;
        this.auditLogger = auditLogger;
    }

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
                            log.info("Redis connection established - using Redis for account lockout");
                        } else {
                            log.warn("Redis ping returned unexpected response - using in-memory account lockout");
                        }
                    } catch (Exception e) {
                        redisAvailable = false;
                        log.warn("Redis not available - using in-memory account lockout");
                    }
                } else {
                    redisAvailable = false;
                    log.warn("RedisTemplate not configured - using in-memory account lockout");
                }
                redisChecked = true;
            }
        }

        return redisAvailable;
    }

    /**
     * Record a failed login attempt.
     *
     * @return true if account should be locked
     */
    public boolean recordFailedAttempt(String email, String ipAddress) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return false;
        }

        try {
            if (isRedisAvailable()) {
                return recordFailedAttemptRedis(emailKey, ipAddress);
            }
            return recordFailedAttemptInMemory(emailKey, ipAddress);
        } catch (Exception e) {
            log.error("Error recording failed attempt: {}", e.getMessage());
            return false;
        }
    }

    private boolean recordFailedAttemptRedis(String email, String ipAddress) {
        RedisTemplate<String, String> template = this.redisTemplate;
        if (template == null) {
            return recordFailedAttemptInMemory(email, ipAddress);
        }

        String attemptKey = ATTEMPT_PREFIX + email;
        Long attempts = template.opsForValue().increment(attemptKey);
        if (attempts == null) {
            attempts = 1L;
        }
        if (attempts == 1L) {
            template.expire(attemptKey, ATTEMPT_WINDOW);
        }

        log.warn("Failed login attempt {} for email: {} from IP: {}", attempts, email, ipAddress);

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            lockAccount(email, ipAddress, attempts.intValue());
            return true;
        }
        return false;
    }

    private boolean recordFailedAttemptInMemory(String email, String ipAddress) {
        resetAttemptWindowIfExpired(email);

        inMemoryAttemptStart.putIfAbsent(email, System.currentTimeMillis());
        int attempts = inMemoryAttempts.merge(email, 1, Integer::sum);

        log.warn("Failed login attempt {} for email: {} from IP: {} (in-memory)", attempts, email, ipAddress);

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            lockAccount(email, ipAddress, attempts);
            return true;
        }
        return false;
    }

    public void lockAccount(String email, String ipAddress, int failedAttempts) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return;
        }

        try {
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    template.opsForValue().set(
                            LOCKOUT_PREFIX + emailKey,
                            String.valueOf(System.currentTimeMillis()),
                            LOCKOUT_DURATION
                    );
                } else {
                    inMemoryLockouts.put(emailKey, System.currentTimeMillis() + LOCKOUT_DURATION.toMillis());
                }
            } else {
                inMemoryLockouts.put(emailKey, System.currentTimeMillis() + LOCKOUT_DURATION.toMillis());
            }

            auditLogger.logAccountLockout(emailKey, ipAddress, failedAttempts);
            log.warn("Account locked for email: {} after {} failed attempts", emailKey, failedAttempts);
        } catch (Exception e) {
            log.error("Error locking account: {}", e.getMessage());
        }
    }

    public boolean isAccountLocked(String email) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return false;
        }

        try {
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    return Boolean.TRUE.equals(template.hasKey(LOCKOUT_PREFIX + emailKey));
                }
            }
            return isAccountLockedInMemory(emailKey);
        } catch (Exception e) {
            log.error("Error checking account lock status: {}", e.getMessage());
            return isAccountLockedInMemory(emailKey);
        }
    }

    private boolean isAccountLockedInMemory(String email) {
        Long lockoutUntil = inMemoryLockouts.get(email);
        if (lockoutUntil == null) {
            return false;
        }
        if (System.currentTimeMillis() < lockoutUntil) {
            return true;
        }
        inMemoryLockouts.remove(email);
        return false;
    }

    public long getRemainingLockoutTime(String email) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return 0;
        }

        try {
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    Long ttl = template.getExpire(LOCKOUT_PREFIX + emailKey, TimeUnit.SECONDS);
                    return ttl != null && ttl > 0 ? ttl : 0;
                }
            }

            Long lockoutUntil = inMemoryLockouts.get(emailKey);
            if (lockoutUntil == null) {
                return 0;
            }
            long remaining = (lockoutUntil - System.currentTimeMillis()) / 1000;
            return Math.max(0, remaining);
        } catch (Exception e) {
            log.error("Error getting lockout time: {}", e.getMessage());
            return 0;
        }
    }

    public void clearFailedAttempts(String email) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return;
        }

        try {
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    template.delete(ATTEMPT_PREFIX + emailKey);
                    return;
                }
            }
            inMemoryAttempts.remove(emailKey);
            inMemoryAttemptStart.remove(emailKey);
        } catch (Exception e) {
            log.error("Error clearing failed attempts: {}", e.getMessage());
        }
    }

    public void unlockAccount(String email) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return;
        }

        try {
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    template.delete(LOCKOUT_PREFIX + emailKey);
                    template.delete(ATTEMPT_PREFIX + emailKey);
                }
            }
            inMemoryLockouts.remove(emailKey);
            inMemoryAttempts.remove(emailKey);
            inMemoryAttemptStart.remove(emailKey);
            log.info("Account manually unlocked for email: {}", emailKey);
        } catch (Exception e) {
            log.error("Error unlocking account: {}", e.getMessage());
        }
    }

    public int getFailedAttemptCount(String email) {
        String emailKey = normalizeEmail(email);
        if (emailKey == null) {
            return 0;
        }

        try {
            if (isRedisAvailable()) {
                RedisTemplate<String, String> template = this.redisTemplate;
                if (template != null) {
                    String count = template.opsForValue().get(ATTEMPT_PREFIX + emailKey);
                    return parseOrZero(count);
                }
            }

            resetAttemptWindowIfExpired(emailKey);
            return inMemoryAttempts.getOrDefault(emailKey, 0);
        } catch (Exception e) {
            log.error("Error getting failed attempt count: {}", e.getMessage());
            return 0;
        }
    }

    private int parseOrZero(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private void resetAttemptWindowIfExpired(String email) {
        Long attemptStart = inMemoryAttemptStart.get(email);
        if (attemptStart == null) {
            return;
        }
        long elapsed = System.currentTimeMillis() - attemptStart;
        if (elapsed > ATTEMPT_WINDOW.toMillis()) {
            inMemoryAttemptStart.remove(email);
            inMemoryAttempts.remove(email);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
