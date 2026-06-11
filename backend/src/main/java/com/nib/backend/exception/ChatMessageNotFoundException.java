package com.nib.backend.exception;

import java.util.UUID;

public class ChatMessageNotFoundException extends RuntimeException {
    public ChatMessageNotFoundException(UUID id) {
        super("Chat message not found: " + id);
    }
}
