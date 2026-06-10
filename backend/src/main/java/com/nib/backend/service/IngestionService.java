package com.nib.backend.service;

import com.nib.backend.config.CostControlProperties;
import com.nib.backend.dto.IngestionIssueDto;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngestionService {

    private static final String SCOPE = "ingestion";
    private static final Pattern PAGE_ISSUE_PATTERN = Pattern.compile("^Page (\\d+) (.+)$");

    private final IngestionJobRepository ingestionJobRepository;
    private final DocumentRepository documentRepository;
    private final IngestionRunner ingestionRunner;
    private final CostControlProperties costControls;
    private final SlidingWindowRateLimiter rateLimiter;
    private final CostTelemetryService costTelemetryService;

    @Value("${ingestion.job.stale-after-minutes:60}")
    private long staleAfterMinutes = 60;

    /**
     * Creates an ingestion job and fires the async pipeline via IngestionRunner.
     * Returns immediately — the pipeline runs in the ingestionExecutor thread pool.
     */
    @Transactional
    public IngestionJob createAndTrigger(UUID documentId) {
        Optional<IngestionJob> activeJob = ingestionJobRepository
                .findFirstByDocumentIdAndStatusOrderByCreatedAtDesc(documentId, IngestionStatus.PROCESSING);
        if (activeJob.isPresent()) {
            IngestionJob job = activeJob.get();
            if (!isStale(job)) {
                log.info("Ingestion already in progress for document {}", documentId);
                return job;
            }
            markStaleJobFailed(job);
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
                try {
                    ingestionRunner.run(documentId, jobId);
                } catch (RuntimeException ex) {
                    markLaunchFailed(jobId, ex);
                    throw ex;
                }
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
            costTelemetryService.record(
                    document.getUser().getId(),
                    CostTelemetryService.RATE_LIMIT_HIT,
                    1,
                    Map.of("scope", "ingestion", "reason", "max_pages_per_document", "pageCount", pageCount)
            );
            throw new RateLimitException("Document has " + pageCount
                    + " pages, which exceeds the ingestion limit of "
                    + ingestion.getMaxPagesPerDocument() + " pages.");
        }

        User user = document.getUser();
        UUID userId = user.getId();
        long activeJobs = ingestionJobRepository.countActiveJobsForUser(userId);
        if (ingestion.getMaxConcurrentJobsPerUser() > 0
                && activeJobs >= ingestion.getMaxConcurrentJobsPerUser()) {
            costTelemetryService.record(
                    userId,
                    CostTelemetryService.RATE_LIMIT_HIT,
                    1,
                    Map.of("scope", "ingestion", "reason", "max_concurrent_jobs")
            );
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
            costTelemetryService.record(
                    userId,
                    CostTelemetryService.RATE_LIMIT_HIT,
                    1,
                    Map.of("scope", "ingestion", "reason", "trigger_window", "retryAfterSeconds", retryAfter)
            );
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
                .map(this::toStatusResponse)
                .orElse(new IngestionStatusResponse(
                        null,
                        documentId,
                        "NOT_STARTED",
                        null,
                        0,
                        0,
                        false,
                        true,
                        null,
                        List.of(),
                        null,
                        null,
                        null
                ));
    }

    private IngestionStatusResponse toStatusResponse(IngestionJob job) {
        List<IngestionIssueDto> issues = parseIssues(job.getWarningMessage());
        boolean hasPartialFailures = (job.getPagesFailed() != null && job.getPagesFailed() > 0)
                || !issues.isEmpty();
        boolean retryable = job.getStatus() == IngestionStatus.FAILED || isStale(job);

        return new IngestionStatusResponse(
                job.getId(),
                job.getDocumentId(),
                job.getStatus().name(),
                job.getPagesTotal(),
                job.getPagesProcessed(),
                job.getPagesFailed(),
                hasPartialFailures,
                retryable,
                job.getWarningMessage(),
                issues,
                job.getErrorMessage(),
                job.getStartedAt() != null ? job.getStartedAt().toString() : null,
                job.getCompletedAt() != null ? job.getCompletedAt().toString() : null
        );
    }

    private List<IngestionIssueDto> parseIssues(String warningMessage) {
        if (warningMessage == null || warningMessage.isBlank()) return List.of();

        return warningMessage.lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .map(this::parseIssue)
                .toList();
    }

    private IngestionIssueDto parseIssue(String line) {
        Matcher pageMatcher = PAGE_ISSUE_PATTERN.matcher(line);
        if (pageMatcher.matches()) {
            int pageNumber = Integer.parseInt(pageMatcher.group(1));
            return new IngestionIssueDto(
                    pageNumber,
                    stageForMessage(line),
                    "warning",
                    line
            );
        }

        return new IngestionIssueDto(
                null,
                stageForMessage(line),
                "warning",
                line
        );
    }

    private static String stageForMessage(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("render")) return "visual_render";
        if (lower.contains("visual")) return "visual_analysis";
        if (lower.contains("summary")) return "document_summary";
        if (lower.contains("text")) return "text_extraction";
        return "ingestion";
    }

    private boolean isStale(IngestionJob job) {
        if (job.getStatus() != IngestionStatus.PROCESSING) return false;
        LocalDateTime startedAt = job.getStartedAt();
        if (startedAt == null) return true;
        return startedAt.isBefore(LocalDateTime.now().minusMinutes(staleAfterMinutes));
    }

    private void markStaleJobFailed(IngestionJob job) {
        String message = "Ingestion job was marked failed after being stuck in PROCESSING for more than "
                + staleAfterMinutes + " minutes; retry is allowed.";
        log.warn("{} document={} job={}", message, job.getDocumentId(), job.getId());
        job.setStatus(IngestionStatus.FAILED);
        job.setErrorMessage(message);
        job.setCompletedAt(LocalDateTime.now());
        ingestionJobRepository.save(job);
    }

    private void markLaunchFailed(UUID jobId, RuntimeException ex) {
        ingestionJobRepository.findById(jobId).ifPresent(job -> {
            String message = "Failed to start ingestion worker: " + ex.getMessage();
            log.error("{} document={} job={}", message, job.getDocumentId(), jobId, ex);
            job.setStatus(IngestionStatus.FAILED);
            job.setErrorMessage(message);
            job.setCompletedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);
        });
    }
}
