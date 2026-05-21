package com.nib.backend.service;

import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Separate component so @Async runs through Spring's proxy.
 * IngestionService must not call its own @Async methods directly (self-invocation bypasses the proxy).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IngestionRunner {

    private final DocumentRepository documentRepository;
    private final IngestionJobRepository ingestionJobRepository;
    private final ContentBlockRepository contentBlockRepository;
    private final SupabaseStorageService storageService;
    private final TextExtractionService textExtractionService;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final VectorSearchService vectorSearchService;

    private static final String EMBED_MODEL = "mistral-embed";

    @Async("ingestionExecutor")
    public void run(UUID documentId, UUID jobId) {
        IngestionJob job = ingestionJobRepository.findById(jobId).orElseThrow();

        try {
            var doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

            job.setStatus(IngestionStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);

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
                if (chunks.isEmpty()) {
                    incrementProcessed(job);
                    continue;
                }

                // Save all blocks for this page first
                List<ContentBlock> blocks = new java.util.ArrayList<>();
                for (int j = 0; j < chunks.size(); j++) {
                    blocks.add(contentBlockRepository.save(ContentBlock.builder()
                            .documentId(documentId)
                            .pageNumber(pageNumber)
                            .blockType("text")
                            .chunkIndex(j)
                            .extractedText(chunks.get(j))
                            .tokenCount(chunkingService.estimateTokens(chunks.get(j)))
                            .build()));
                }

                // Embed all chunks in one batched API call — one request per page, not per chunk
                List<float[]> embeddings = embeddingService.embedBatch(chunks);
                for (int j = 0; j < blocks.size(); j++) {
                    vectorSearchService.saveEmbedding(blocks.get(j).getId(), embeddings.get(j), EMBED_MODEL);
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

    private void incrementProcessed(IngestionJob job) {
        job.setPagesProcessed(job.getPagesProcessed() + 1);
        ingestionJobRepository.save(job);
    }
}
