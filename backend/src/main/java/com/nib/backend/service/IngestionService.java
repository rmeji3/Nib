package com.nib.backend.service;

import com.nib.backend.config.CostControlProperties;
import com.nib.backend.dto.IngestionStatusResponse;
import com.nib.backend.exception.DocumentNotFoundException;
import com.nib.backend.exception.RateLimitException;
import com.nib.backend.model.Document;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.model.User;
import com.nib.backend.repository.DocumentRepository;
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

    private static final String SCOPE = "ingestion";

    private final IngestionJobRepository ingestionJobRepository;
    private final DocumentRepository documentRepository;
    private final IngestionRunner ingestionRunner;
    private final CostControlProperties costControls;
    private final SlidingWindowRateLimiter rateLimiter;

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

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
        enforceIngestionBudget(document);

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

    private void enforceIngestionBudget(Document document) {
        var ingestion = costControls.getIngestion();
        if (!costControls.isEnabled() || !ingestion.isEnabled()) {
            return;
        }

        Integer pageCount = document.getPageCount();
        if (pageCount != null
                && ingestion.getMaxPagesPerDocument() > 0
                && pageCount > ingestion.getMaxPagesPerDocument()) {
            throw new RateLimitException("Document has " + pageCount
                    + " pages, which exceeds the ingestion limit of "
                    + ingestion.getMaxPagesPerDocument() + " pages.");
        }

        User user = document.getUser();
        UUID userId = user.getId();
        long activeJobs = ingestionJobRepository.countActiveJobsForUser(userId);
        if (ingestion.getMaxConcurrentJobsPerUser() > 0
                && activeJobs >= ingestion.getMaxConcurrentJobsPerUser()) {
            throw new RateLimitException("Too many ingestion jobs are already running. Please wait for one to finish.");
        }

        boolean allowed = rateLimiter.tryAcquire(
                SCOPE,
                userId.toString(),
                ingestion.getMaxTriggersPerWindow(),
                ingestion.getWindowSeconds()
        );
        if (!allowed) {
            long retryAfter = rateLimiter.secondsUntilReset(SCOPE, userId.toString(), ingestion.getWindowSeconds());
            throw new RateLimitException(
                    "Ingestion budget exceeded. Please try again in " + retryAfter + " seconds.",
                    retryAfter
            );
        }
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
                        j.getPagesFailed(),
                        j.getWarningMessage(),
                        j.getErrorMessage(),
                        j.getStartedAt() != null ? j.getStartedAt().toString() : null,
                        j.getCompletedAt() != null ? j.getCompletedAt().toString() : null
                ))
                .orElse(new IngestionStatusResponse(null, documentId, "NOT_STARTED", null, 0, 0, null, null, null, null));
    }
}
