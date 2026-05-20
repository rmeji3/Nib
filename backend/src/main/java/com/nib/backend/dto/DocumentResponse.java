package com.nib.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String filename,
        String originalFilename,
        String storageUrl,
        Long fileSizeBytes,
        Integer pageCount,
        LocalDateTime createdAt
) {}
