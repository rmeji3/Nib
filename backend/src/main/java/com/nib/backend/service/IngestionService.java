package com.nib.backend.service;

import com.nib.backend.dto.IngestionStatusResponse;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngestionService {

    private final IngestionJobRepository ingestionJobRepository;
    private final IngestionRunner ingestionRunner;

    /**
     * Creates an ingestion job and fires the async pipeline via IngestionRunner.
     * Returns immediately — the pipeline runs in the ingestionExecutor thread pool.
     */
    @Transactional
    public IngestionJob createAndTrigger(UUID documentId) {
        if (ingestionJobRepository.existsByDocumentIdAndStatus(documentId, IngestionStatus.PROCESSING)) {
            log.info("Ingestion already in progress for document {}", documentId);
            return ingestionJobRepository.findFirstByDocumentIdOrderByCreatedAtDesc(documentId).orElseThrow();
        }

        IngestionJob job = ingestionJobRepository.save(
                IngestionJob.builder().documentId(documentId).build()
        );
        log.info("Created ingestion job {} for document {}", job.getId(), documentId);

        // Fire AFTER the current transaction commits so the document and job records
        // are visible to the async thread when it reads them from the DB
        UUID jobId = job.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                ingestionRunner.run(documentId, jobId);
            }
        });

        return job;
    }

    @Transactional(readOnly = true)
    public IngestionStatusResponse getStatus(UUID documentId) {
        return ingestionJobRepository
                .findFirstByDocumentIdOrderByCreatedAtDesc(documentId)
                .map(j -> new IngestionStatusResponse(
                        j.getId(),
                        j.getDocumentId(),
                        j.getStatus().name(),
                        j.getPagesTotal(),
                        j.getPagesProcessed(),
                        j.getErrorMessage(),
                        j.getStartedAt() != null ? j.getStartedAt().toString() : null,
                        j.getCompletedAt() != null ? j.getCompletedAt().toString() : null
                ))
                .orElse(new IngestionStatusResponse(null, documentId, "NOT_STARTED", null, 0, null, null, null));
    }
}
