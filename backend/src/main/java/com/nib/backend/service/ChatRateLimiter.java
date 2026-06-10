package com.nib.backend.service;

import com.nib.backend.config.CostControlProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Per-user chat budget on top of the global API limiter. Chat calls are much
 * more expensive because they can invoke embeddings and Gemini generation.
 */
@Component
@RequiredArgsConstructor
public class ChatRateLimiter {

    private static final String SCOPE = "chat";

    private final CostControlProperties costControls;
    private final SlidingWindowRateLimiter rateLimiter;

    public boolean tryAcquire(UUID userId) {
        var chat = costControls.getChat();
        if (!costControls.isEnabled() || !chat.isEnabled()) {
            return true;
        }
        return rateLimiter.tryAcquire(SCOPE, userId.toString(), chat.getMaxRequestsPerWindow(), chat.getWindowSeconds());
    }

    public long secondsUntilReset(UUID userId) {
        return rateLimiter.secondsUntilReset(SCOPE, userId.toString(), costControls.getChat().getWindowSeconds());
    }
}
