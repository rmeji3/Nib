package com.nib.backend.service;

import com.nib.backend.dto.BBox;
import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import com.nib.backend.service.ChunkingService.PositionedChunk;
import com.nib.backend.service.PositionedTextExtractor.PositionedPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.cos.COSName;
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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

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
    private final PositionedTextExtractor positionedTextExtractor;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final VectorSearchService vectorSearchService;
    private final VisionService visionService;

    private static final String EMBED_MODEL = "mistral-embed";
    private static final String BLOCK_TEXT = "text";
    private static final String BLOCK_VISUAL = "visual_summary";
    private static final String BLOCK_DOC_SUMMARY = "document_summary";

    /**
     * Max chunks per Mistral embeddings API call.
     * The API limit is 512, but at very high batch sizes the per-request latency
     * starts to compete with the savings from fewer round-trips. 256 is the
     * sweet spot in practice for our typical 1.5–4 KB chunks.
     */
    private static final int EMBED_BATCH_SIZE = 256;

    /**
     * Minimum trimmed length for a page's extracted text to be worth indexing.
     * Below this, PDFBox has typically only recovered stray glyphs (e.g. "e")
     * from a page whose font encoding it can't decode. Such fragments become
     * useless "citation excerpts" in the UI. Vision still covers the page.
     */
    private static final int MIN_TEXT_LENGTH = 30;

    /**
     * If a page has at least this much clean, non-character-spaced text AND no
     * embedded images, we skip Gemini Vision on it entirely — the text extract
     * alone is enough, and we save 5-10 s per page. The threshold is
     * deliberately high (300 chars ≈ a substantial paragraph) so we never skip
     * a sparse page that might actually have a chart with little surrounding text.
     */
    private static final int TEXT_ONLY_SKIP_VISION_THRESHOLD = 300;

    @Value("${ingestion.vision.enabled:true}")
    private boolean visionEnabled;

    /**
     * How many Gemini Vision API calls can be in-flight at once. Each call takes
     * 5–10 seconds, so concurrency directly multiplies indexing throughput.
     * Default raised from 8 → 12 to push further into Gemini's paid-tier rate
     * envelope (~2000 RPM). If you see 429s in the logs, drop this to 8.
     */
    @Value("${ingestion.vision.concurrency:12}")
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

            // ── 2. Extract text per page (with positions) ─────────────────────────
            List<PositionedPage> pages = positionedTextExtractor.extractPages(pdfBytes);
            int totalPages = pages.size();

            job.setPagesTotal(totalPages);
            ingestionJobRepository.save(job);
            log.info("Starting multimodal ingestion: {} pages for document {}", totalPages, documentId);

            // ── 3. Build all pending blocks (text + visual) ───────────────────────
            //    Vision API calls dominate ingestion time (~5–10 s each).
            //    Strategy: render pages sequentially with one PDDocument (PDFBox
            //    is not thread-safe), but dispatch each Gemini Vision call to a
            //    thread pool as soon as its render finishes. While the renderer
            //    moves to page N+1, page N's API call is already running.
            record PendingBlock(
                    int pageNumber,
                    int chunkIndex,
                    String text,
                    String blockType,
                    BBox bbox,
                    Double pageWidth,
                    Double pageHeight
            ) {}
            List<PendingBlock> pending = new ArrayList<>();

            // ── 3a. Fire all visual analysis tasks in parallel ──────────────────
            // Progress accounting: pagesProcessed ticks up each time a vision task
            // completes, so the frontend's polling sees real-time progress instead
            // of a single jump at the end. We coalesce DB writes (every page or
            // every ~500 ms) so the IngestionJob table doesn't get hammered.
            List<CompletableFuture<String>> visionFutures = new ArrayList<>(totalPages);
            ExecutorService visionExecutor = null;
            long visionStart = System.currentTimeMillis();
            AtomicInteger completedCounter = new AtomicInteger(0);
            if (visionEnabled) {
                int concurrency = Math.max(1, Math.min(visionConcurrency, totalPages));
                visionExecutor = Executors.newFixedThreadPool(concurrency, r -> {
                    Thread t = new Thread(r, "vision-api");
                    t.setDaemon(true);
                    return t;
                });
                log.info("Dispatching vision tasks with concurrency {} for document {}",
                        concurrency, documentId);
                try (PDDocument pdfDoc = Loader.loadPDF(pdfBytes)) {
                    final ExecutorService exec = visionExecutor;
                    final UUID finalJobId = jobId;
                    final int finalTotalPages = totalPages;
                    int dispatched = 0;
                    int skipped = 0;
                    for (int i = 0; i < totalPages; i++) {
                        // Fast path: if PDFBox got clean abundant text from this page AND
                        // the page has no embedded images, vision adds almost nothing
                        // and we can save ~5-10 s by skipping it.
                        if (canSkipVisionForPage(pages.get(i), pdfDoc.getPage(i))) {
                            skipped++;
                            int done = completedCounter.incrementAndGet();
                            updateProgress(finalJobId, done, finalTotalPages);
                            visionFutures.add(CompletableFuture.completedFuture(null));
                            continue;
                        }

                        byte[] pngBytes;
                        try {
                            pngBytes = visionService.renderPageFromDocument(pdfDoc, i);
                        } catch (Exception ex) {
                            log.warn("Failed to render page {} — skipping its visual block: {}",
                                    i + 1, ex.getMessage());
                            // Still tick progress so the user sees movement even on skipped pages.
                            int done = completedCounter.incrementAndGet();
                            updateProgress(finalJobId, done, finalTotalPages);
                            visionFutures.add(CompletableFuture.completedFuture(null));
                            continue;
                        }
                        final int pageNumber = i + 1;
                        final byte[] image = pngBytes;
                        CompletableFuture<String> future = CompletableFuture
                                .supplyAsync(() -> visionService.analyzeRenderedImage(image, pageNumber), exec)
                                .whenComplete((result, err) -> {
                                    int done = completedCounter.incrementAndGet();
                                    updateProgress(finalJobId, done, finalTotalPages);
                                });
                        visionFutures.add(future);
                        dispatched++;
                    }
                    log.info("Vision dispatch summary: {} pages dispatched, {} pages skipped (text-only, no images)",
                            dispatched, skipped);
                }
            }

            // ── 3b. Build text blocks while vision runs in the background ───────
            for (int i = 0; i < totalPages; i++) {
                PositionedPage page = pages.get(i);
                int pageNumber = page.pageNumber();
                String pageText = page.text();

                if (pageText != null && !pageText.isBlank()) {
                    String trimmed = pageText.trim();
                    if (trimmed.length() < MIN_TEXT_LENGTH) {
                        log.debug("Page {} text is too short ({} chars) — skipping text blocks, " +
                                  "visual block will cover this page", pageNumber, trimmed.length());
                    } else if (isCharacterSpaced(pageText)) {
                        log.debug("Page {} has character-spaced text (font encoding artifact) — " +
                                  "skipping text blocks, visual block will cover this page", pageNumber);
                    } else {
                        List<PositionedChunk> chunks = chunkingService.chunkWithPositions(page);
                        for (PositionedChunk pc : chunks) {
                            pending.add(new PendingBlock(
                                    pageNumber,
                                    pc.chunkIndex(),
                                    pc.text(),
                                    BLOCK_TEXT,
                                    pc.bbox(),
                                    page.pageWidth(),
                                    page.pageHeight()
                            ));
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
                            // Visual blocks cover the whole page — bbox is the page rectangle
                            PositionedPage page = pages.get(i);
                            BBox fullPage = new BBox(0.0, 0.0, page.pageWidth(), page.pageHeight());
                            pending.add(new PendingBlock(
                                    page.pageNumber(), 0, visualSummary, BLOCK_VISUAL,
                                    fullPage, page.pageWidth(), page.pageHeight()
                            ));
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

            // ── 3d. Generate document-summary block ──────────────────────────
            // A single embedded "what is this document about" paragraph at
            // page 1. Meta-questions ("summarize this", "what is this about",
            // "what cafe is this") otherwise have nothing close to them in
            // embedding space — every chunk is about specific facts. This
            // block fixes that and is the biggest win for vague top-of-funnel
            // questions. The summary is multimodal: Gemini Vision sees the
            // first page image alongside the document text, so titles and
            // logos (often stylised graphics that text extraction misses) are
            // captured reliably.
            if (!pending.isEmpty()) {
                String combined = pending.stream()
                        .filter(p -> p.text() != null)
                        .map(PendingBlock::text)
                        .collect(Collectors.joining("\n\n"));

                // Render page 1 once for the summary call. This is cheap
                // (~50 ms) compared to the Gemini call itself.
                byte[] firstPageImage = null;
                try (PDDocument coverDoc = Loader.loadPDF(pdfBytes)) {
                    if (coverDoc.getNumberOfPages() > 0) {
                        firstPageImage = visionService.renderPageFromDocument(coverDoc, 0);
                    }
                } catch (Exception ex) {
                    log.warn("Could not render first page for summary — falling back to text-only: {}",
                            ex.getMessage());
                }

                String summary = visionService.generateDocumentSummary(firstPageImage, combined);
                if (summary != null && !summary.isBlank()) {
                    pending.add(new PendingBlock(
                            1,                  // anchored to page 1 for citation purposes
                            0,
                            summary,
                            BLOCK_DOC_SUMMARY,
                            null, null, null    // no bbox — this is a synthetic block
                    ));
                    log.info("Added document_summary block for document {}", documentId);

                    // Phase 4 — extract document type from the summary's TYPE: line
                    // and persist it on the document for type-aware prompting.
                    String docType = extractDocType(summary);
                    if (docType != null) {
                        doc.setDocType(docType);
                        documentRepository.save(doc);
                        log.info("Document type classified as '{}' for document {}", docType, documentId);
                    }
                }
            }

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
                    BBox bb = pb.bbox();
                    blockEntities.add(ContentBlock.builder()
                            .documentId(documentId)
                            .pageNumber(pb.pageNumber())
                            .blockType(pb.blockType())
                            .chunkIndex(pb.chunkIndex())
                            .extractedText(pb.text())
                            .tokenCount(chunkingService.estimateTokens(pb.text()))
                            .bboxX(bb != null ? bb.x() : null)
                            .bboxY(bb != null ? bb.y() : null)
                            .bboxWidth(bb != null ? bb.width() : null)
                            .bboxHeight(bb != null ? bb.height() : null)
                            .pageWidth(pb.pageWidth())
                            .pageHeight(pb.pageHeight())
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
     * Persist incremental ingestion progress so the frontend's status polling sees
     * real-time updates. We accept the small overhead of one UPDATE per page
     * completion — at 8-way concurrency on a 10-page PDF that's ~10 writes
     * spread over ~30 s, which is fine. Errors are swallowed: a failed progress
     * write must never crash ingestion itself.
     */
    private void updateProgress(UUID jobId, int pagesProcessed, int pagesTotal) {
        try {
            IngestionJob job = ingestionJobRepository.findById(jobId).orElse(null);
            if (job == null) return;
            // Cap at total — a race where the counter briefly exceeds total would
            // make the UI show >100% otherwise.
            int capped = Math.min(pagesProcessed, pagesTotal);
            if (job.getPagesProcessed() != null && job.getPagesProcessed() >= capped) return;
            job.setPagesProcessed(capped);
            ingestionJobRepository.save(job);
        } catch (Exception ex) {
            log.debug("Failed to write progress update for job {} ({}): {}",
                    jobId, pagesProcessed, ex.getMessage());
        }
    }

    /**
     * Heuristic: skip Gemini Vision on a page when:
     *  • PDFBox extracted abundant clean text from it (≥ TEXT_ONLY_SKIP_VISION_THRESHOLD
     *    characters, not character-spaced), AND
     *  • The PDF page has no embedded image XObjects, AND
     *  • The page is not one of the first two — titles, logos, brand names and
     *    cover content live there, and our image-detection heuristic misses
     *    vector logos (e.g. a stylized "Subah Cafe" rendered as path operators
     *    rather than an embedded PNG). Always running vision on the first two
     *    pages costs at most 2 extra Gemini calls but guarantees we never lose
     *    the document's identity to a heuristic miss.
     *
     * On a text-heavy 200-page report this still avoids ~90% of vision calls
     * — each ~5-10 s — and is the single biggest indexing-speed win.
     *
     * Conservative: when in doubt we run vision. The failure mode of running
     * vision unnecessarily is "wasted time"; the failure mode of skipping it
     * when needed is "lost content from a chart/figure/logo", which is much worse.
     */
    private boolean canSkipVisionForPage(PositionedPage page, PDPage pdfPage) {
        if (page.pageNumber() <= 2) return false;            // always vision on cover pages
        String text = page.text();
        if (text == null) return false;
        String trimmed = text.trim();
        if (trimmed.length() < TEXT_ONLY_SKIP_VISION_THRESHOLD) return false;
        if (isCharacterSpaced(text)) return false;
        try {
            if (hasEmbeddedImages(pdfPage)) return false;
        } catch (Exception ex) {
            // If we can't tell, err on the side of running vision.
            return false;
        }
        return true;
    }

    /**
     * Returns true if the page contains at least one PDImageXObject. This
     * catches photos, embedded figures, and chart bitmaps. Vector-only diagrams
     * (drawn with PDF path operators rather than embedded as an image) won't
     * trip this check, but they're rare in practice and almost always
     * accompany dense text where vision adds little.
     */
    private boolean hasEmbeddedImages(PDPage page) {
        PDResources resources = page.getResources();
        if (resources == null) return false;
        for (COSName name : resources.getXObjectNames()) {
            try {
                PDXObject xobj = resources.getXObject(name);
                if (xobj instanceof PDImageXObject) return true;
            } catch (Exception ignored) {
                // Some malformed XObjects throw; treat them as "unknown" and
                // bias toward running vision.
                return true;
            }
        }
        return false;
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

    /**
     * Phase 4 — extract a normalized document type from the summary's TYPE: line.
     * The summary format guarantees "TYPE: <phrase>" on the second line (e.g.
     * "TYPE: Cafe menu", "TYPE: Research paper on liquid cooling"). We map the
     * phrase to a short canonical category for type-aware prompt selection.
     */
    private static String extractDocType(String summary) {
        for (String line : summary.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.toUpperCase().startsWith("TYPE:")) {
                String raw = trimmed.substring(5).trim().toLowerCase();
                if (raw.isEmpty()) return null;
                // Map to canonical categories
                if (raw.contains("menu") || raw.contains("cafe") || raw.contains("restaurant") || raw.contains("food"))
                    return "menu";
                if (raw.contains("research") || raw.contains("paper") || raw.contains("academic") || raw.contains("journal"))
                    return "academic";
                if (raw.contains("financial") || raw.contains("earnings") || raw.contains("quarterly") || raw.contains("annual report"))
                    return "financial";
                if (raw.contains("contract") || raw.contains("agreement") || raw.contains("legal") || raw.contains("policy") || raw.contains("terms"))
                    return "legal";
                if (raw.contains("technical") || raw.contains("specification") || raw.contains("manual") || raw.contains("engineering"))
                    return "technical";
                if (raw.contains("catalog") || raw.contains("catalogue") || raw.contains("product") || raw.contains("brochure"))
                    return "catalog";
                return "mixed";
            }
        }
        return null;
    }
}
