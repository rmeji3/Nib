package com.nib.backend.repository;

import com.nib.backend.model.ContentBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.util.UUID;

public interface ContentBlockRepository extends JpaRepository<ContentBlock, UUID> {

    List<ContentBlock> findByDocumentIdOrderByPageNumberAscChunkIndexAsc(UUID documentId);

    /** Bulk-deletes all blocks for a document. Returns the number of deleted rows. */
    @Modifying
    long deleteByDocumentId(UUID documentId);

    long countByDocumentId(UUID documentId);
}
