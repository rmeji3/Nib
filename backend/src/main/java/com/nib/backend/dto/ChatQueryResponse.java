package com.nib.backend.dto;

import java.util.List;
import java.util.UUID;

public record ChatQueryResponse(
        UUID messageId,
        UUID sessionId,
        String answer,
        List<CitationDto> citations,
        String modelVersion,
        String createdAt,
        double confidence,
        double groundedness,
        GroundingVerificationDto groundingVerification,
        boolean refused
) {
    /** Convenience constructor without Phase 3 fields (non-refused normal response). */
    public ChatQueryResponse(UUID messageId, UUID sessionId, String answer,
                             List<CitationDto> citations, String modelVersion, String createdAt) {
        this(messageId, sessionId, answer, citations, modelVersion, createdAt, 0.0, 0.0, null, false);
    }
}
