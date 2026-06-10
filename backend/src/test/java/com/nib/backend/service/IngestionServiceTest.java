package com.nib.backend.service;

import com.nib.backend.config.CostControlProperties;
import com.nib.backend.exception.RateLimitException;
import com.nib.backend.model.Document;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.model.User;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class IngestionServiceTest {

    private final IngestionJobRepository repository = mock(IngestionJobRepository.class);
    private final DocumentRepository documentRepository = mock(DocumentRepository.class);
    private final IngestionRunner runner = mock(IngestionRunner.class);
    private final CostControlProperties costControls = new CostControlProperties();
    private final SlidingWindowRateLimiter rateLimiter = mock(SlidingWindowRateLimiter.class);
    private final IngestionService service = new IngestionService(
            repository,
            documentRepository,
            runner,
            costControls,
            rateLimiter
    );

    @Test
    void getStatusIncludesPartialIngestionWarnings() {
        UUID documentId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        LocalDateTime completedAt = LocalDateTime.of(2026, 6, 10, 12, 0);

        IngestionJob job = IngestionJob.builder()
                .id(jobId)
                .documentId(documentId)
                .status(IngestionStatus.COMPLETE)
                .pagesTotal(4)
                .pagesProcessed(4)
                .pagesFailed(1)
                .warningMessage("Page 3 visual extraction produced no summary")
                .completedAt(completedAt)
                .build();
        when(repository.findFirstByDocumentIdOrderByCreatedAtDesc(documentId)).thenReturn(Optional.of(job));

        var response = service.getStatus(documentId);

        assertThat(response.jobId()).isEqualTo(jobId);
        assertThat(response.status()).isEqualTo("COMPLETE");
        assertThat(response.pagesFailed()).isEqualTo(1);
        assertThat(response.hasPartialFailures()).isTrue();
        assertThat(response.retryable()).isFalse();
        assertThat(response.warningMessage()).contains("Page 3");
        assertThat(response.issues()).hasSize(1);
        assertThat(response.issues().get(0).pageNumber()).isEqualTo(3);
        assertThat(response.issues().get(0).stage()).isEqualTo("visual_analysis");
        assertThat(response.issues().get(0).severity()).isEqualTo("warning");
        assertThat(response.completedAt()).isEqualTo("2026-06-10T12:00");
    }

    @Test
    void createAndTriggerRejectsDocumentsOverPageLimit() {
        UUID documentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        costControls.getIngestion().setMaxPagesPerDocument(10);
        Document document = Document.builder()
                .id(documentId)
                .user(User.builder().id(userId).email("ada@example.com").name("Ada").password("pw").build())
                .pageCount(11)
                .build();
        when(repository.existsByDocumentIdAndStatus(documentId, IngestionStatus.PROCESSING)).thenReturn(false);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));

        assertThatThrownBy(() -> service.createAndTrigger(documentId))
                .isInstanceOf(RateLimitException.class)
                .hasMessageContaining("exceeds the ingestion limit");
    }

    @Test
    void createAndTriggerRejectsTooManyConcurrentJobsForUser() {
        UUID documentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        costControls.getIngestion().setMaxConcurrentJobsPerUser(1);
        Document document = Document.builder()
                .id(documentId)
                .user(User.builder().id(userId).email("ada@example.com").name("Ada").password("pw").build())
                .pageCount(5)
                .build();
        when(repository.existsByDocumentIdAndStatus(documentId, IngestionStatus.PROCESSING)).thenReturn(false);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(repository.countActiveJobsForUser(userId)).thenReturn(1L);

        assertThatThrownBy(() -> service.createAndTrigger(documentId))
                .isInstanceOf(RateLimitException.class)
                .hasMessageContaining("already running");
    }

    @Test
    void createAndTriggerReturnsActiveProcessingJobWhenItIsNotStale() {
        UUID documentId = UUID.randomUUID();
        IngestionJob activeJob = IngestionJob.builder()
                .id(UUID.randomUUID())
                .documentId(documentId)
                .status(IngestionStatus.PROCESSING)
                .startedAt(LocalDateTime.now())
                .build();
        when(repository.findFirstByDocumentIdAndStatusOrderByCreatedAtDesc(documentId, IngestionStatus.PROCESSING))
                .thenReturn(Optional.of(activeJob));

        IngestionJob result = service.createAndTrigger(documentId);

        assertThat(result).isSameAs(activeJob);
        verifyNoInteractions(runner);
    }

    @Test
    void createAndTriggerFailsStaleProcessingJobAndCreatesRetry() {
        UUID documentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        IngestionJob staleJob = IngestionJob.builder()
                .id(UUID.randomUUID())
                .documentId(documentId)
                .status(IngestionStatus.PROCESSING)
                .startedAt(LocalDateTime.now().minusHours(2))
                .build();
        Document document = Document.builder()
                .id(documentId)
                .user(User.builder().id(userId).email("ada@example.com").name("Ada").password("pw").build())
                .pageCount(5)
                .build();

        when(repository.findFirstByDocumentIdAndStatusOrderByCreatedAtDesc(documentId, IngestionStatus.PROCESSING))
                .thenReturn(Optional.of(staleJob));
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(rateLimiter.tryAcquire("ingestion", userId.toString(),
                costControls.getIngestion().getMaxTriggersPerWindow(),
                costControls.getIngestion().getWindowSeconds())).thenReturn(true);
        when(repository.save(any(IngestionJob.class))).thenAnswer(invocation -> {
            IngestionJob job = invocation.getArgument(0);
            if (job.getId() == null) {
                job.setId(UUID.randomUUID());
            }
            return job;
        });

        TransactionSynchronizationManager.initSynchronization();
        try {
            IngestionJob result = service.createAndTrigger(documentId);

            assertThat(staleJob.getStatus()).isEqualTo(IngestionStatus.FAILED);
            assertThat(staleJob.getErrorMessage()).contains("stuck in PROCESSING");
            assertThat(result.getId()).isNotNull();
            assertThat(result).isNotSameAs(staleJob);
            verify(repository).save(staleJob);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
