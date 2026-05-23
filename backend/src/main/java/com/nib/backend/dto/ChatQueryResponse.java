package com.nib.backend.dto;

import java.util.List;
import java.util.UUID;

/**
 * Response payload for a chat query.
 *
 * Phase 3 adds two real-quality signals (previously hardcoded on the frontend):
 *  - {@code confidence}    [0..1]   — derived from retrieval similarity. Lower
 *                                     values trigger the UI's "low confidence"
 *                                     banner; very low values trigger backend
 *                                     refusal before Gemini is even called.
 *  - {@code groundedness}  [0..1]   — fraction of answer sentences that contain
 *                                     at least one [Page N] citation.
 *  - {@code refused}        boolean — true when retrieval was too weak to answer
 *                                     and a canned "not enough info" was returned
 *                                     without calling the LLM.
 */
public record ChatQueryResponse(
        UUID messageId,
        UUID sessionId,
        String answer,
        List<CitationDto> citations,
        String modelVersion,
        String createdAt,
        double confidence,
        double groundedness,
        boolean refused
) {}
