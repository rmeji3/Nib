package com.nib.backend.dto;

import java.util.List;
import java.util.UUID;

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
