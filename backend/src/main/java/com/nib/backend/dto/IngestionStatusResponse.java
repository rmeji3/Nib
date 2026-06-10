package com.nib.backend.dto;

import java.util.UUID;

public record IngestionStatusResponse(
        UUID jobId,
        UUID documentId,
        String status,
        Integer pagesTotal,
        Integer pagesProcessed,
        Integer pagesFailed,
        String warningMessage,
        String errorMessage,
        String startedAt,
        String completedAt
) {}
