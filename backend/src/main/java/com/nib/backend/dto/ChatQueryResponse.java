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
        boolean refused
) {}
