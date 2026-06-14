package com.nib.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record AuthResponse(
    UUID userId,
    String email,
    String name,
    String settings,
    String subscriptionTier,
    Instant subscriptionPeriodEnd,
    boolean subscriptionCancelAtPeriodEnd
) {}
