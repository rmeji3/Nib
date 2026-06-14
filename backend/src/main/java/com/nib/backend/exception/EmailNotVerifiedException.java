package com.nib.backend.exception;

/**
 * Thrown when a user with an unconfirmed email address attempts to authenticate.
 * Mapped to HTTP 403 by {@code GlobalExceptionHandler}.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
