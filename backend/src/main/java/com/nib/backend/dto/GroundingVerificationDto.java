package com.nib.backend.dto;

import java.util.List;
import java.util.UUID;

/**
 * Post-answer grounding check. This is a deterministic verification pass over
 * the model output and retrieved source metadata; it validates citation coverage
 * and source-id mapping, but does not claim full semantic entailment.
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
