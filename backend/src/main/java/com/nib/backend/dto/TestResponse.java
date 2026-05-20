package com.nib.backend.dto;

import java.time.LocalDateTime;

public record TestResponse(
    String message,
    String greeting,
    LocalDateTime timestamp
) {}
