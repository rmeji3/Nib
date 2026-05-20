package com.nib.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameRequest(
        @NotBlank(message = "Name cannot be blank")
        @Size(max = 255, message = "Name must be 255 characters or fewer")
        String name
) {}
