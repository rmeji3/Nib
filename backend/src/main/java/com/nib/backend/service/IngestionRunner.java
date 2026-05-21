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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Separate component so @Async runs through Spring's proxy.
 * IngestionService must not call its own @Async methods directly (self-invocation bypasses the proxy).
 *
 * Performance design:
 *  - All page texts are chunked upfront (no API calls yet).
 *  - All chunks across ALL pages are embedded in as few Mistral API calls as possible
 *    (batches of up to EMBED_BATCH_SIZE to stay within API limits).
 *  - ContentBlocks are saved in one saveAll() call.
 *  - Embeddings are saved in one batchUpdate() call.
 *  This reduces API calls from N_pages to ceil(total_chunks / EMBED_BATCH_SIZE).
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
    /** Max chunks per Mistral embeddings API call (their documented limit is 512). */
    private static final int EMBED_BATCH_SIZE = 128;

    @Async("ingestionExecutor")
    public void run(UUID documentId, UUID jobId) {
        IngestionJob job = ingestionJobRepository.findById(jobId).orElseThrow();

        try {
            var doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

            job.setStatus(IngestionStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);

            // ── 1. Download & extract ─────────────────────────────────────────────
            byte[] pdfBytes = storageService.downloadFile(doc.getStoragePath());
            List<String> pageTexts = textExtractionService.extractPages(pdfBytes);
            int totalPages = pageTexts.size();

            job.setPagesTotal(totalPages);
            ingestionJobRepository.save(job);
            log.info("Extracted {} pages for document {}", totalPages, documentId);

            // ── 2. Chunk every page — no API calls yet ────────────────────────────
            record PendingChunk(int pageNumber, int chunkIndex, String text) {}
            List<PendingChunk> pending = new ArrayList<>();

            for (int i = 0; i < totalPages; i++) {
                String pageText = pageTexts.get(i);
                if (pageText == null || pageText.isBlank()) continue;
                List<String> chunks = chunkingService.chunk(pageText);
                for (int j = 0; j < chunks.size(); j++) {
                    pending.add(new PendingChunk(i + 1, j, chunks.get(j)));
                }
            }

            log.info("Chunked into {} total chunks for document {}", pending.size(), documentId);

            if (!pending.isEmpty()) {
                List<String> allTexts = pending.stream().map(PendingChunk::text).toList();

                // ── 3. Embed ALL chunks in minimal API calls (batched) ────────────
                List<float[]> allEmbeddings = new ArrayList<>(allTexts.size());
                for (int i = 0; i < allTexts.size(); i += EMBED_BATCH_SIZE) {
                    List<String> batch = allTexts.subList(i, Math.min(i + EMBED_BATCH_SIZE, allTexts.size()));
                    log.info("Embedding batch {}/{} ({} chunks) for document {}",
                            (i / EMBED_BATCH_SIZE) + 1,
                            (int) Math.ceil((double) allTexts.size() / EMBED_BATCH_SIZE),
                            batch.size(), documentId);
                    allEmbeddings.addAll(embeddingService.embedBatch(batch));
                }

                // ── 4. Save all ContentBlocks in one round-trip ───────────────────
                List<ContentBlock> blockEntities = new ArrayList<>(pending.size());
                for (PendingChunk pc : pending) {
                    blockEntities.add(ContentBlock.builder()
                            .documentId(documentId)
                            .pageNumber(pc.pageNumber())
                            .blockType("text")
                            .chunkIndex(pc.chunkIndex())
                            .extractedText(pc.text())
                            .tokenCount(chunkingService.estimateTokens(pc.text()))
                            .build());
                }
                List<ContentBlock> savedBlocks = contentBlockRepository.saveAll(blockEntities);

                // ── 5. Batch-insert all embeddings in one round-trip ──────────────
                vectorSearchService.saveEmbeddingsBatch(savedBlocks, allEmbeddings, EMBED_MODEL);
            }

            job.setPagesProcessed(totalPages);
            job.setStatus(IngestionStatus.COMPLETE);
            job.setCompletedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);
            log.info("Ingestion complete for document {} — job {} ({} pages, {} chunks)",
                    documentId, jobId, totalPages, pending.isEmpty() ? 0 : pending.size());

        } catch (Exception ex) {
            log.error("Ingestion failed for document {} — job {}: {}", documentId, jobId, ex.getMessage(), ex);
            job.setStatus(IngestionStatus.FAILED);
            job.setErrorMessage(ex.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);
        }
    }
}
