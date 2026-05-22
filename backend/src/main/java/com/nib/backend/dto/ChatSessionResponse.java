package com.nib.backend.dto;

import java.util.UUID;

public record ChatSessionResponse(
        UUID id,
        UUID documentId,
        String title,
        String createdAt
) {}
