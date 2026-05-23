package com.nib.backend.dto;

import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String filename,
        String originalFilename,
        String storageUrl,
        Long fileSizeBytes,
        Integer pageCount,
        String createdAt,       // ISO-8601 string, e.g. "2026-05-19T20:35:06"
        String deletedAt,       // null for active docs; ISO-8601 when trashed
        boolean isStarred,
        String lastOpenedAt     // null until first open; ISO-8601 when set
) {}
