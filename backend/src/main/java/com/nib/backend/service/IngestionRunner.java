package com.nib.backend.service;

import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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

    /**
     * Minimum trimmed length for a page's extracted text to be worth indexing.
     * Below this, PDFBox has typically only recovered stray glyphs (e.g. "e")
     * from a page whose font encoding it can't decode. Such fragments become
     * useless "citation excerpts" in the UI. Vision still covers the page.
     */
    private static final int MIN_TEXT_LENGTH = 30;

    @Value("${ingestion.vision.enabled:true}")
    private boolean visionEnabled;

    /**
     * How many Gemini Vision API calls can be in-flight at once. Each call takes
     * 5–10 seconds, so concurrency directly multiplies indexing throughput.
     * 8 is a safe default for paid Gemini quotas (~2000 RPM); lower if you see
     * rate limit errors.
     */
    @Value("${ingestion.vision.concurrency:8}")
    private int visionConcurrency;

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
            //    Vision API calls dominate ingestion time (~5–10 s each).
            //    Strategy: render pages sequentially with one PDDocument (PDFBox
            //    is not thread-safe), but dispatch each Gemini Vision call to a
            //    thread pool as soon as its render finishes. While the renderer
            //    moves to page N+1, page N's API call is already running.
            record PendingBlock(int pageNumber, int chunkIndex, String text, String blockType) {}
            List<PendingBlock> pending = new ArrayList<>();

            // ── 3a. Fire all visual analysis tasks in parallel ──────────────────
            List<CompletableFuture<String>> visionFutures = new ArrayList<>(totalPages);
            ExecutorService visionExecutor = null;
            long visionStart = System.currentTimeMillis();
            if (visionEnabled) {
                int concurrency = Math.max(1, Math.min(visionConcurrency, totalPages));
                visionExecutor = Executors.newFixedThreadPool(concurrency, r -> {
                    Thread t = new Thread(r, "vision-api");
                    t.setDaemon(true);
                    return t;
                });
                log.info("Dispatching {} vision tasks with concurrency {} for document {}",
                        totalPages, concurrency, documentId);
                try (PDDocument pdfDoc = Loader.loadPDF(pdfBytes)) {
                    final ExecutorService exec = visionExecutor;
                    for (int i = 0; i < totalPages; i++) {
                        byte[] pngBytes;
                        try {
                            pngBytes = visionService.renderPageFromDocument(pdfDoc, i);
                        } catch (Exception ex) {
                            log.warn("Failed to render page {} — skipping its visual block: {}",
                                    i + 1, ex.getMessage());
                            visionFutures.add(CompletableFuture.completedFuture(null));
                            continue;
                        }
                        final int pageNumber = i + 1;
                        final byte[] image = pngBytes;
                        visionFutures.add(CompletableFuture.supplyAsync(
                                () -> visionService.analyzeRenderedImage(image, pageNumber), exec));
                    }
                }
            }

            // ── 3b. Build text blocks while vision runs in the background ───────
            for (int i = 0; i < totalPages; i++) {
                int pageNumber = i + 1;
                String pageText = pageTexts.get(i);

                if (pageText != null && !pageText.isBlank()) {
                    String trimmed = pageText.trim();
                    if (trimmed.length() < MIN_TEXT_LENGTH) {
                        log.debug("Page {} text is too short ({} chars) — skipping text blocks, " +
                                  "visual block will cover this page", pageNumber, trimmed.length());
                    } else if (isCharacterSpaced(pageText)) {
                        log.debug("Page {} has character-spaced text (font encoding artifact) — " +
                                  "skipping text blocks, visual block will cover this page", pageNumber);
                    } else {
                        List<String> chunks = chunkingService.chunk(pageText);
                        for (int j = 0; j < chunks.size(); j++) {
                            pending.add(new PendingBlock(pageNumber, j, chunks.get(j), BLOCK_TEXT));
                        }
                    }
                }
            }

            // ── 3c. Collect vision results (waits for any still-running calls) ──
            if (visionEnabled) {
                for (int i = 0; i < visionFutures.size(); i++) {
                    try {
                        String visualSummary = visionFutures.get(i).get();
                        if (visualSummary != null && !visualSummary.isBlank()) {
                            pending.add(new PendingBlock(i + 1, 0, visualSummary, BLOCK_VISUAL));
                        }
                    } catch (Exception ex) {
                        log.warn("Vision task for page {} failed: {}", i + 1, ex.getMessage());
                    }
                }
                if (visionExecutor != null) {
                    visionExecutor.shutdown();
                    visionExecutor.awaitTermination(5, TimeUnit.SECONDS);
                }
                log.info("Vision analysis complete in {} ms ({} pages)",
                        System.currentTimeMillis() - visionStart, totalPages);
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

    /**
     * Returns true when PDFBox has produced character-spaced output like "e g g s 2 0"
     * instead of normal words. This happens with some PDF fonts that encode each glyph
     * at an explicit X position with inter-character gaps PDFBox reads as spaces.
     * Such text is useless for RAG — Gemini Vision covers those pages instead.
     */
    private static boolean isCharacterSpaced(String text) {
        String[] tokens = text.trim().split("\\s+");
        if (tokens.length < 10) return false;
        long singleCharCount = 0;
        for (String t : tokens) if (t.length() == 1) singleCharCount++;
        return (double) singleCharCount / tokens.length > 0.65;
    }
}
