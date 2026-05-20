package com.nib.backend.service;

import com.nib.backend.dto.IngestionStatusResponse;
import com.nib.backend.exception.DocumentNotFoundException;
import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngestionService {

    private final DocumentRepository documentRepository;
    private final IngestionJobRepository ingestionJobRepository;
    private final ContentBlockRepository contentBlockRepository;
    private final SupabaseStorageService storageService;
    private final TextExtractionService textExtractionService;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final VectorSearchService vectorSearchService;

    private static final String EMBED_MODEL = "mistral-embed";
    private static final int TOP_K = 5;

    /**
     * Creates an ingestion job record and fires the async pipeline.
     * Returns immediately — the job runs in the ingestionExecutor thread pool.
     */
    @Transactional
    public IngestionJob createAndTrigger(UUID documentId) {
        // Only one active job per document at a time
        if (ingestionJobRepository.existsByDocumentIdAndStatus(documentId, IngestionStatus.PROCESSING)) {
            log.info("Ingestion already in progress for document {}", documentId);
            return ingestionJobRepository.findFirstByDocumentIdOrderByCreatedAtDesc(documentId).orElseThrow();
        }

        IngestionJob job = ingestionJobRepository.save(
                IngestionJob.builder().documentId(documentId).build()
        );
        log.info("Created ingestion job {} for document {}", job.getId(), documentId);
        ingestAsync(documentId, job.getId());
        return job;
    }

    @Async("ingestionExecutor")
    public void ingestAsync(UUID documentId, UUID jobId) {
        IngestionJob job = ingestionJobRepository.findById(jobId).orElseThrow();

        try {
            var doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new DocumentNotFoundException(documentId));

            // Mark processing
            job.setStatus(IngestionStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);

            // Download PDF from Supabase Storage
            byte[] pdfBytes = storageService.downloadFile(doc.getStoragePath());
            List<String> pageTexts = textExtractionService.extractPages(pdfBytes);

            job.setPagesTotal(pageTexts.size());
            ingestionJobRepository.save(job);

            log.info("Ingesting {} pages for document {}", pageTexts.size(), documentId);

            for (int i = 0; i < pageTexts.size(); i++) {
                int pageNumber = i + 1;
                String pageText = pageTexts.get(i);

                if (pageText == null || pageText.isBlank()) {
                    incrementProcessed(job);
                    continue;
                }

                List<String> chunks = chunkingService.chunk(pageText);
                for (int j = 0; j < chunks.size(); j++) {
                    String chunkText = chunks.get(j);

                    ContentBlock block = contentBlockRepository.save(ContentBlock.builder()
                            .documentId(documentId)
                            .pageNumber(pageNumber)
                            .blockType("text")
                            .chunkIndex(j)
                            .extractedText(chunkText)
                            .tokenCount(chunkingService.estimateTokens(chunkText))
                            .build());

                    float[] embedding = embeddingService.embed(chunkText);
                    vectorSearchService.saveEmbedding(block.getId(), embedding, EMBED_MODEL);
                }

                incrementProcessed(job);
            }

            job.setStatus(IngestionStatus.COMPLETE);
            job.setCompletedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);
            log.info("Ingestion complete for document {} — job {}", documentId, jobId);

        } catch (Exception ex) {
            log.error("Ingestion failed for document {} — job {}: {}", documentId, jobId, ex.getMessage(), ex);
            job.setStatus(IngestionStatus.FAILED);
            job.setErrorMessage(ex.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);
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
                        j.getErrorMessage(),
                        j.getStartedAt() != null ? j.getStartedAt().toString() : null,
                        j.getCompletedAt() != null ? j.getCompletedAt().toString() : null
                ))
                .orElse(new IngestionStatusResponse(null, documentId, "NOT_STARTED", null, 0, null, null, null));
    }

    private void incrementProcessed(IngestionJob job) {
        job.setPagesProcessed(job.getPagesProcessed() + 1);
        ingestionJobRepository.save(job);
    }
}
