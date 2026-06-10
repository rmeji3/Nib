package com.nib.backend.service;

import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.IngestionJobRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IngestionServiceTest {

    @Test
    void getStatusIncludesPartialIngestionWarnings() {
        IngestionJobRepository repository = mock(IngestionJobRepository.class);
        IngestionRunner runner = mock(IngestionRunner.class);
        IngestionService service = new IngestionService(repository, runner);
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
        assertThat(response.warningMessage()).contains("Page 3");
        assertThat(response.completedAt()).isEqualTo("2026-06-10T12:00");
    }
}
