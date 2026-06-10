package com.nib.backend.repository;

import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IngestionJobRepository extends JpaRepository<IngestionJob, UUID> {

    Optional<IngestionJob> findFirstByDocumentIdOrderByCreatedAtDesc(UUID documentId);

    Optional<IngestionJob> findFirstByDocumentIdAndStatusOrderByCreatedAtDesc(UUID documentId, IngestionStatus status);

    boolean existsByDocumentIdAndStatus(UUID documentId, IngestionStatus status);
}
