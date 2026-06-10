package com.nib.backend.dto;

import java.util.List;
import java.util.UUID;

/**
 * Post-answer grounding telemetry. This deterministic check validates citation
 * coverage and source-id mapping for the final answer returned to the client.
 */
public record GroundingVerificationDto(
        boolean verified,
        String verdict,
        double score,
        int checkedSentences,
        int citedSentences,
        List<String> uncitedClaims,
        List<String> unmappedCitations,
        List<UUID> citedBlockIds
) {}
