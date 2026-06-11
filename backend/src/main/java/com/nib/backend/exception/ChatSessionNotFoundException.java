package com.nib.backend.exception;

import java.util.UUID;

public class ChatSessionNotFoundException extends RuntimeException {
    public ChatSessionNotFoundException(UUID id) {
        super("Chat session not found: " + id);
    }
}
