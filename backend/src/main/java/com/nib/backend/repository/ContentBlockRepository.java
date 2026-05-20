package com.nib.backend.repository;

import com.nib.backend.model.ContentBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContentBlockRepository extends JpaRepository<ContentBlock, UUID> {

    List<ContentBlock> findByDocumentIdOrderByPageNumberAscChunkIndexAsc(UUID documentId);

    void deleteByDocumentId(UUID documentId);

    long countByDocumentId(UUID documentId);
}
