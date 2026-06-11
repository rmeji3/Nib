package com.nib.backend.dto;

import java.util.List;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        String role,
        String content,
        List<CitationDto> citations,
        String createdAt,
        Double confidence,
        Double groundedness,
        boolean reported
) {}
