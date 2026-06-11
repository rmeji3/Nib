package com.nib.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageFeedbackRequest(
        @NotBlank
        @Size(max = 32)
        String type,

        @Size(max = 1000)
        String note
) {}
