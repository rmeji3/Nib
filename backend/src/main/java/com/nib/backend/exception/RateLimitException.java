package com.nib.backend.exception;

/**
 * Thrown when an upstream AI provider (Gemini, Mistral) returns HTTP 429.
 * Translated to a 429 response by GlobalExceptionHandler so the client
 * receives a readable message instead of a raw 500.
 */
public class RateLimitException extends RuntimeException {
    private final Long retryAfterSeconds;

    public RateLimitException(String message) {
        this(message, null);
    }

    public RateLimitException(String message, Long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public Long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
