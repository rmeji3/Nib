package com.nib.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCollectionRequest(
        @NotBlank(message = "Name cannot be blank")
        @Size(max = 100, message = "Collection name must be 100 characters or fewer")
        String name
) {}
