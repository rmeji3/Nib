package com.nib.backend.dto;

/**
 * User-visible ingestion issue. A null pageNumber means the issue applies to
 * the whole document or pipeline stage rather than one page.
 */
public record IngestionIssueDto(
        Integer pageNumber,
        String stage,
        String severity,
        String message
) {}
