package com.nib.backend.service;

import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Separate component so @Async runs through Spring's proxy.
 * IngestionService must not call its own @Async methods directly.
 *
 * Phase 2 multimodal pipeline:
 *  1. Download PDF, extract text per page.
 *  2. Render each page to PNG → Gemini Vision → visual summary block.
 *  3. Chunk text pages → text blocks.
 *  4. Batch-embed ALL blocks (text + visual) in minimal Mistral API calls.
 *  5. saveAll() content blocks, batchUpdate() embeddings — two DB round-trips total.
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
    private final VisionService visionService;

    private static final String EMBED_MODEL = "mistral-embed";
    private static final String BLOCK_TEXT = "text";
    private static final String BLOCK_VISUAL = "visual_summary";

    /** Max chunks per Mistral embeddings API call (API limit is 512). */
    private static final int EMBED_BATCH_SIZE = 128;

    @Value("${ingestion.vision.enabled:true}")
    private boolean visionEnabled;

    @Async("ingestionExecutor")
    public void run(UUID documentId, UUID jobId) {
        IngestionJob job = ingestionJobRepository.findById(jobId).orElseThrow();

        try {
            var doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

            job.setStatus(IngestionStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);

            // ── 1. Download PDF ───────────────────────────────────────────────────
            byte[] pdfBytes = storageService.downloadFile(doc.getStoragePath());

            // ── 2. Extract text per page ──────────────────────────────────────────
            List<String> pageTexts = textExtractionService.extractPages(pdfBytes);
            int totalPages = pageTexts.size();

            job.setPagesTotal(totalPages);
            ingestionJobRepository.save(job);
            log.info("Starting multimodal ingestion: {} pages for document {}", totalPages, documentId);

            // ── 3. Build all pending blocks (text + visual) ───────────────────────
            //    We collect them all before calling any embedding API so we can
            //    batch everything into the minimum number of Mistral API calls.
            record PendingBlock(int pageNumber, int chunkIndex, String text, String blockType) {}
            List<PendingBlock> pending = new ArrayList<>();

            for (int i = 0; i < totalPages; i++) {
                int pageNumber = i + 1;
                String pageText = pageTexts.get(i);

                // ── 3a. Text chunks ───────────────────────────────────────────────
                if (pageText != null && !pageText.isBlank()) {
                    List<String> chunks = chunkingService.chunk(pageText);
                    for (int j = 0; j < chunks.size(); j++) {
                        pending.add(new PendingBlock(pageNumber, j, chunks.get(j), BLOCK_TEXT));
                    }
                }

                // ── 3b. Visual summary (Gemini Vision) ───────────────────────────
                if (visionEnabled) {
                    log.debug("Running vision analysis for page {}/{}", pageNumber, totalPages);
                    String visualSummary = visionService.analyzePageImage(pdfBytes, i);
                    if (visualSummary != null && !visualSummary.isBlank()) {
                        pending.add(new PendingBlock(pageNumber, 0, visualSummary, BLOCK_VISUAL));
                    }
                }
            }

            log.info("Collected {} total blocks ({} text + {} visual) for document {}",
                    pending.size(),
                    pending.stream().filter(p -> BLOCK_TEXT.equals(p.blockType())).count(),
                    pending.stream().filter(p -> BLOCK_VISUAL.equals(p.blockType())).count(),
                    documentId);

            if (!pending.isEmpty()) {
                // ── 4. Batch embed ALL blocks in minimal Mistral API calls ─────────
                List<String> allTexts = pending.stream().map(PendingBlock::text).toList();
                List<float[]> allEmbeddings = new ArrayList<>(allTexts.size());

                for (int i = 0; i < allTexts.size(); i += EMBED_BATCH_SIZE) {
                    List<String> batch = allTexts.subList(i, Math.min(i + EMBED_BATCH_SIZE, allTexts.size()));
                    log.info("Embedding batch {}/{} ({} items) for document {}",
                            (i / EMBED_BATCH_SIZE) + 1,
                            (int) Math.ceil((double) allTexts.size() / EMBED_BATCH_SIZE),
                            batch.size(), documentId);
                    allEmbeddings.addAll(embeddingService.embedBatch(batch));
                }

                // ── 5. Save all content blocks (one saveAll round-trip) ───────────
                List<ContentBlock> blockEntities = new ArrayList<>(pending.size());
                for (PendingBlock pb : pending) {
                    blockEntities.add(ContentBlock.builder()
                            .documentId(documentId)
                            .pageNumber(pb.pageNumber())
                            .blockType(pb.blockType())
                            .chunkIndex(pb.chunkIndex())
                            .extractedText(pb.text())
                            .tokenCount(chunkingService.estimateTokens(pb.text()))
                            .build());
                }
                List<ContentBlock> savedBlocks = contentBlockRepository.saveAll(blockEntities);

                // ── 6. Batch save all embeddings (one batchUpdate round-trip) ──────
                vectorSearchService.saveEmbeddingsBatch(savedBlocks, allEmbeddings, EMBED_MODEL);
            }

            job.setPagesProcessed(totalPages);
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
}
