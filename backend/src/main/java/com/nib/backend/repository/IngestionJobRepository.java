package com.nib.backend.repository;

import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IngestionJobRepository extends JpaRepository<IngestionJob, UUID> {

    Optional<IngestionJob> findFirstByDocumentIdOrderByCreatedAtDesc(UUID documentId);

    Optional<IngestionJob> findFirstByDocumentIdAndStatusOrderByCreatedAtDesc(UUID documentId, IngestionStatus status);

    boolean existsByDocumentIdAndStatus(UUID documentId, IngestionStatus status);

    @Query("""
            SELECT COUNT(j)
            FROM IngestionJob j
            JOIN Document d ON d.id = j.documentId
            WHERE d.user.id = :userId
              AND j.status IN (com.nib.backend.model.IngestionStatus.PENDING, com.nib.backend.model.IngestionStatus.PROCESSING)
            """)
    long countActiveJobsForUser(@Param("userId") UUID userId);
}
