package com.nib.backend.dto;

import java.util.UUID;
import java.util.List;

public record IngestionStatusResponse(
        UUID jobId,
        UUID documentId,
        String status,
        Integer pagesTotal,
        Integer pagesProcessed,
        Integer pagesFailed,
        boolean hasPartialFailures,
        boolean retryable,
        String warningMessage,
        List<IngestionIssueDto> issues,
        String errorMessage,
        String startedAt,
        String completedAt
) {}
