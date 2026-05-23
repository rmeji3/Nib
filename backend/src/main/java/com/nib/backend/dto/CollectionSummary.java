package com.nib.backend.dto;

import java.util.UUID;

public record CollectionSummary(
        UUID id,
        String name,
        long documentCount,
        String createdAt
) {}
