package com.nib.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UserSettingsRequest(
    String settings
) {}
