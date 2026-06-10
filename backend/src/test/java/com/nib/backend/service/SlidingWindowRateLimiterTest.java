package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SlidingWindowRateLimiterTest {

    @Test
    @SuppressWarnings("unchecked")
    void tryAcquireRejectsRequestsPastWindowBudget() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(redisTemplate);
        String key = "nib:rate-limit:api:user-1";
        when(redisTemplate.execute(any(RedisScript.class), eq(List.of(key)), eq("60")))
                .thenReturn(1L, 2L, 3L);
        when(redisTemplate.getExpire(key, TimeUnit.SECONDS)).thenReturn(42L);

        assertThat(limiter.tryAcquire("api", "user-1", 2, 60)).isTrue();
        assertThat(limiter.tryAcquire("api", "user-1", 2, 60)).isTrue();
        assertThat(limiter.tryAcquire("api", "user-1", 2, 60)).isFalse();
        assertThat(limiter.secondsUntilReset("api", "user-1", 60)).isEqualTo(42L);
    }

    @Test
    @SuppressWarnings("unchecked")
    void scopesHaveIndependentBudgets() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(redisTemplate);
        when(redisTemplate.execute(any(RedisScript.class), eq(List.of("nib:rate-limit:api:user-1")), eq("60")))
                .thenReturn(1L, 2L);
        when(redisTemplate.execute(any(RedisScript.class), eq(List.of("nib:rate-limit:chat:user-1")), eq("60")))
                .thenReturn(1L);

        assertThat(limiter.tryAcquire("api", "user-1", 1, 60)).isTrue();
        assertThat(limiter.tryAcquire("api", "user-1", 1, 60)).isFalse();
        assertThat(limiter.tryAcquire("chat", "user-1", 1, 60)).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void tryAcquireFailsClosedWhenRedisFails() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(redisTemplate);
        when(redisTemplate.execute(any(RedisScript.class), eq(List.of("nib:rate-limit:api:user-1")), eq("60")))
                .thenThrow(new IllegalStateException("redis unavailable"));
        when(redisTemplate.getExpire("nib:rate-limit:api:user-1", TimeUnit.SECONDS))
                .thenThrow(new IllegalStateException("redis unavailable"));

        assertThat(limiter.tryAcquire("api", "user-1", 1, 60)).isFalse();
        assertThat(limiter.secondsUntilReset("api", "user-1", 60)).isEqualTo(60L);
    }
}
