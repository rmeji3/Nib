package com.nib.backend.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record AddToCollectionRequest(
        @NotEmpty(message = "At least one document ID is required")
        List<UUID> documentIds
) {}
