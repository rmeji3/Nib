package com.nib.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Phase 4 — Cost controls: lightweight in-process per-user rate limiter for
 * chat queries. Uses a sliding-window counter reset on each new time window.
 *
 * Configured via:
 *   chat.rate-limit.max-requests-per-window  (default 20)
 *   chat.rate-limit.window-seconds           (default 60)
 *
 * Intentionally simple — no Redis, no distributed state. Sufficient for a
 * single-instance deployment; replace with Bucket4j + Redis for multi-replica.
 */
@Component
@Slf4j
public class ChatRateLimiter {

    @Value("${chat.rate-limit.max-requests-per-window:20}")
    private int maxRequests;

    @Value("${chat.rate-limit.window-seconds:60}")
    private long windowSeconds;

    private record WindowCounter(AtomicInteger count, long windowStart) {}

    private final ConcurrentHashMap<UUID, WindowCounter> counters = new ConcurrentHashMap<>();

    /**
     * Returns true if the user is allowed to make another request.
     * Increments their counter atomically.
     */
    public boolean tryAcquire(UUID userId) {
        long now = System.currentTimeMillis() / 1000;

        WindowCounter wc = counters.compute(userId, (id, existing) -> {
            if (existing == null || (now - existing.windowStart()) >= windowSeconds) {
                // New window — reset counter
                return new WindowCounter(new AtomicInteger(0), now);
            }
            return existing;
        });

        int current = wc.count().incrementAndGet();
        if (current > maxRequests) {
            log.warn("Rate limit exceeded for user {} ({} requests in {} s window)",
                    userId, current, windowSeconds);
            return false;
        }
        return true;
    }

    /**
     * Returns how many seconds remain in the user's current window,
     * useful for building a Retry-After header.
     */
    public long secondsUntilReset(UUID userId) {
        WindowCounter wc = counters.get(userId);
        if (wc == null) return 0;
        long elapsed = System.currentTimeMillis() / 1000 - wc.windowStart();
        return Math.max(0, windowSeconds - elapsed);
    }
}
