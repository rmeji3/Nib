package com.nib.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatQueryRequest(
        @NotBlank(message = "Question cannot be blank")
        @Size(max = 2000, message = "Question must be 2000 characters or fewer")
        String question
) {}
