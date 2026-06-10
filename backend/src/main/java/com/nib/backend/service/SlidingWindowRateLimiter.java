package com.nib.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class SlidingWindowRateLimiter {

    private static final String KEY_PREFIX = "nib:rate-limit:";
    private static final RedisScript<Long> INCREMENT_SCRIPT = new DefaultRedisScript<>("""
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
              redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
            end
            return current
            """, Long.class);

    private final StringRedisTemplate redisTemplate;

    public SlidingWindowRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean tryAcquire(String scope, String subject, int maxRequests, long windowSeconds) {
        if (maxRequests <= 0 || windowSeconds <= 0) {
            return false;
        }

        String key = key(scope, subject);
        try {
            Long current = redisTemplate.execute(INCREMENT_SCRIPT, List.of(key), String.valueOf(windowSeconds));
            if (current == null) {
                log.error("Redis returned no counter value for rate limit key {}", key);
                return false;
            }
            if (current > maxRequests) {
                log.warn("Rate limit exceeded for scope={} subject={} ({} requests in {} s)",
                        scope, subject, current, windowSeconds);
                return false;
            }
            return true;
        } catch (RuntimeException ex) {
            log.error("Redis rate limiter failed for scope={} subject={}", scope, subject, ex);
            return false;
        }
    }

    public long secondsUntilReset(String scope, String subject, long windowSeconds) {
        try {
            Long ttl = redisTemplate.getExpire(key(scope, subject), TimeUnit.SECONDS);
            if (ttl == null || ttl < 0) {
                return windowSeconds;
            }
            return ttl;
        } catch (RuntimeException ex) {
            log.error("Redis TTL lookup failed for scope={} subject={}", scope, subject, ex);
            return windowSeconds;
        }
    }

    private String key(String scope, String subject) {
        return KEY_PREFIX + scope + ":" + subject;
    }
}
