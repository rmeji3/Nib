package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.BBox;
import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.IngestionJob;
import com.nib.backend.model.IngestionStatus;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import com.nib.backend.repository.IngestionJobRepository;
import com.nib.backend.service.ChunkingService.PositionedChunk;
import com.nib.backend.service.PositionedTextExtractor.PositionedPage;
import com.nib.backend.service.VisionService.NormalizedBBox;
import com.nib.backend.service.VisionService.VisualElement;
import com.nib.backend.service.VisionService.VisualExtractionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
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
    private final ObjectMapper objectMapper;
    private final SemanticCacheService semanticCacheService;
    private final CostTelemetryService costTelemetryService;
    private final ConversationStarterService conversationStarterService;

    private static final String EMBED_MODEL = "mistral-embed";
    private static final String BLOCK_TEXT = "text";
    private static final String BLOCK_VISUAL = "visual_summary";
    private static final String BLOCK_DOC_SUMMARY = "document_summary";

    /** Max chunks per Mistral embeddings API call (API limit is 512). */
    private static final int EMBED_BATCH_SIZE = 128;

    /**
     * Minimum trimmed length for a page's extracted text to be worth indexing.
     * Below this, PDFBox has typically only recovered stray glyphs (e.g. "e")
     * from a page whose font encoding it can't decode. Such fragments become
     * useless "citation excerpts" in the UI. Vision still covers the page.
     */
    private static final int MIN_TEXT_LENGTH = 30;

    private record PendingBlock(
            int pageNumber,
            int chunkIndex,
            String text,
            String blockType,
            BBox bbox,
            Double pageWidth,
            Double pageHeight,
            String visualSummary,
            String tableStructure,
            String chartSummary,
            String axisLabels,
            String units,
            String dataPoints,
            String figureCropPath,
            String figureCaption,
            String extractionMetadata
    ) {}

    private record VisionPageResult(byte[] pngBytes, VisualExtractionResult extraction) {}

    private record VisualCropUpload(String path, boolean unsupportedMimeType) {}

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
            UUID userId = doc.getUser().getId();

            job.setStatus(IngestionStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            job.setCompletedAt(null);
            job.setPagesFailed(0);
            job.setWarningMessage(null);
            job.setErrorMessage(null);
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
            List<PendingBlock> pending = new ArrayList<>();
            List<String> warnings = new ArrayList<>();
            Set<Integer> failedVisualPages = new HashSet<>();
            int visionCallsDispatched = 0;

            // ── 3a. Fire all visual analysis tasks in parallel ──────────────────
            List<CompletableFuture<VisionPageResult>> visionFutures = new ArrayList<>(totalPages);
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
                            int failedPage = i + 1;
                            failedVisualPages.add(failedPage);
                            String warning = "Page " + failedPage + " visual extraction failed during render: " + ex.getMessage();
                            warnings.add(warning);
                            log.warn("{} — skipping its visual block", warning);
                            visionFutures.add(CompletableFuture.completedFuture(null));
                            continue;
                        }
                        final int pageNumber = i + 1;
                        final byte[] image = pngBytes;
                        visionCallsDispatched++;
                        visionFutures.add(CompletableFuture.supplyAsync(
                                () -> new VisionPageResult(
                                        image,
                                        visionService.analyzeRenderedImageStructured(image, pageNumber)
                                ),
                                exec));
                    }
                }
            } else {
                warnings.add("Visual analysis disabled; charts, figures, and image-only evidence were not indexed");
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
                                    page.pageHeight(),
                                    null, null, null, null, null, null, null, null, null
                            ));
                        }
                    }
                }
            }

            // ── 3c. Collect vision results (waits for any still-running calls) ──
            if (visionEnabled) {
                for (int i = 0; i < visionFutures.size(); i++) {
                    try {
                        VisionPageResult result = visionFutures.get(i).get();
                        VisualExtractionResult extraction = result != null ? result.extraction() : null;
                        String visualSummary = extraction != null ? extraction.pageSummary() : null;
                        if ((visualSummary != null && !visualSummary.isBlank())
                                || (extraction != null && !extraction.elements().isEmpty())) {
                            // Visual blocks cover the whole page — bbox is the page rectangle
                            PositionedPage page = pages.get(i);
                            BBox fullPage = new BBox(0.0, 0.0, page.pageWidth(), page.pageHeight());
                            if (visualSummary != null && !visualSummary.isBlank()) {
                                pending.add(new PendingBlock(
                                        page.pageNumber(), 0, visualSummary, BLOCK_VISUAL,
                                        fullPage, page.pageWidth(), page.pageHeight(),
                                        visualSummary, null, null, null, null, null, null, null,
                                        extraction.rawJson()
                                ));
                            }
                            addStructuredVisualBlocks(
                                    pending,
                                    documentId,
                                    page,
                                    result.pngBytes(),
                                    extraction
                            );
                        } else {
                            int failedPage = i + 1;
                            if (failedVisualPages.add(failedPage)) {
                                warnings.add("Page " + failedPage + " visual extraction produced no summary");
                            }
                        }
                    } catch (Exception ex) {
                        int failedPage = i + 1;
                        if (failedVisualPages.add(failedPage)) {
                            String warning = "Page " + failedPage + " visual extraction failed: " + ex.getMessage();
                            warnings.add(warning);
                            log.warn("{}", warning);
                        }
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
                    // Phase 4 — extract document type from the summary's TYPE: line
                    // and persist it on the document for type-aware prompting.
                    String docType = extractDocType(summary);
                    if (docType == null) {
                        log.warn("Could not extract doc type from summary for document {}", documentId);
                    }
                    if (docType != null) {
                        doc.setDocType(docType);
                        documentRepository.save(doc);
                        log.info("Document type classified as '{}' for document {}", docType, documentId);
                    }

                    String summaryMetadata = null;
                    try {
                        var signals = conversationStarterService.signalsFromBlockTypes(
                                pending.stream().map(PendingBlock::blockType).toList()
                        );
                        var tailoredStarters = conversationStarterService.generateTailoredStarters(
                                summary,
                                doc.getDocType(),
                                doc.getPageCount(),
                                doc.getOriginalFilename(),
                                signals
                        );
                        if (!tailoredStarters.isEmpty()) {
                            summaryMetadata = conversationStarterService.toExtractionMetadata(tailoredStarters);
                            log.info("Generated {} tailored conversation starter(s) for document {}",
                                    tailoredStarters.size(), documentId);
                        }
                    } catch (Exception ex) {
                        log.warn("Conversation starter generation failed for document {}: {}",
                                documentId, ex.getMessage());
                    }

                    pending.add(new PendingBlock(
                            1,                  // anchored to page 1 for citation purposes
                            0,
                            summary,
                            BLOCK_DOC_SUMMARY,
                            null, null, null,    // no bbox — this is a synthetic block
                            null, null, null, null, null, null, null, null,
                            summaryMetadata
                    ));
                    log.info("Added document_summary block for document {} — summary:\n{}", documentId, summary);
                } else {
                    warnings.add("Document summary generation failed; overview questions may be less reliable");
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
                    costTelemetryService.record(
                            userId,
                            CostTelemetryService.EMBEDDING_BATCH,
                            1,
                            Map.of("documentId", documentId.toString(), "items", batch.size())
                    );
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
                            .visualSummary(pb.visualSummary())
                            .tableStructure(pb.tableStructure())
                            .chartSummary(pb.chartSummary())
                            .axisLabels(pb.axisLabels())
                            .units(pb.units())
                            .dataPoints(pb.dataPoints())
                            .figureCropPath(pb.figureCropPath())
                            .figureCaption(pb.figureCaption())
                            .extractionMetadata(pb.extractionMetadata())
                            .build());
                }
                List<ContentBlock> savedBlocks = contentBlockRepository.saveAll(blockEntities);

                // ── 6. Batch save all embeddings (one batchUpdate round-trip) ──────
                vectorSearchService.saveEmbeddingsBatch(savedBlocks, allEmbeddings, EMBED_MODEL);
            }

            job.setPagesProcessed(totalPages);
            job.setPagesFailed(failedVisualPages.size());
            job.setWarningMessage(warnings.isEmpty() ? null : String.join("\n", warnings));
            job.setStatus(IngestionStatus.COMPLETE);
            job.setCompletedAt(LocalDateTime.now());
            ingestionJobRepository.save(job);
            costTelemetryService.record(
                    userId,
                    CostTelemetryService.PAGES_INGESTED,
                    totalPages,
                    Map.of("documentId", documentId.toString(), "jobId", jobId.toString())
            );
            costTelemetryService.record(
                    userId,
                    CostTelemetryService.VISION_CALL,
                    visionCallsDispatched,
                    Map.of("documentId", documentId.toString(), "jobId", jobId.toString())
            );
            semanticCacheService.evictAnswersForDocument(documentId);
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

    private void addStructuredVisualBlocks(
            List<PendingBlock> pending,
            UUID documentId,
            PositionedPage page,
            byte[] pagePng,
            VisualExtractionResult extraction
    ) {
        int elementIndex = 0;
        boolean cropUploadsDisabled = false;
        for (VisualElement element : extraction.elements()) {
            elementIndex++;
            BBox bbox = toPageBBox(element.bbox(), page.pageWidth(), page.pageHeight());
            String cropPath = null;
            if (!cropUploadsDisabled) {
                VisualCropUpload cropUpload = uploadVisualCrop(
                        documentId,
                        page.pageNumber(),
                        elementIndex,
                        element.type(),
                        pagePng,
                        element.bbox()
                );
                cropPath = cropUpload.path();
                if (cropUpload.unsupportedMimeType()) {
                    cropUploadsDisabled = true;
                    log.warn(
                            "Visual crop uploads disabled for document {} because storage rejected image/png. "
                                    + "Structured visual evidence will still be indexed without crop assets.",
                            documentId
                    );
                }
            }
            String text = buildElementEmbeddingText(page.pageNumber(), element);
            pending.add(new PendingBlock(
                    page.pageNumber(),
                    elementIndex,
                    text,
                    element.type(),
                    bbox,
                    page.pageWidth(),
                    page.pageHeight(),
                    element.summary(),
                    toJson(element.tableStructure()),
                    element.chartSummary(),
                    toJson(element.axisLabels()),
                    toJson(element.units()),
                    toJson(element.dataPoints()),
                    cropPath,
                    element.caption(),
                    elementMetadataJson(element)
            ));
        }
    }

    private String buildElementEmbeddingText(int pageNumber, VisualElement element) {
        StringBuilder sb = new StringBuilder();
        sb.append("Page ").append(pageNumber).append(' ')
          .append(element.type()).append(" visual evidence");
        appendIfPresent(sb, "Title", element.title());
        appendIfPresent(sb, "Summary", element.summary());
        appendIfPresent(sb, "Chart summary", element.chartSummary());
        appendIfPresent(sb, "Caption", element.caption());
        appendIfPresent(sb, "Table structure", toJson(element.tableStructure()));
        appendIfPresent(sb, "Axis labels", toJson(element.axisLabels()));
        appendIfPresent(sb, "Units", toJson(element.units()));
        appendIfPresent(sb, "Data points", toJson(element.dataPoints()));
        return sb.toString();
    }

    private static void appendIfPresent(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append('\n').append(label).append(": ").append(value);
        }
    }

    private BBox toPageBBox(NormalizedBBox bbox, double pageWidth, double pageHeight) {
        NormalizedBBox safe = bbox != null ? bbox : new NormalizedBBox(0, 0, 1, 1);
        return new BBox(
                safe.x() * pageWidth,
                safe.y() * pageHeight,
                safe.width() * pageWidth,
                safe.height() * pageHeight
        );
    }

    private VisualCropUpload uploadVisualCrop(
            UUID documentId,
            int pageNumber,
            int elementIndex,
            String elementType,
            byte[] pagePng,
            NormalizedBBox bbox
    ) {
        try {
            byte[] crop = cropPng(pagePng, bbox);
            String path = "extracted-visuals/%s/page-%d/%s-%d.png"
                    .formatted(documentId, pageNumber, elementType, elementIndex);
            storageService.uploadFile(path, crop, "image/png");
            return new VisualCropUpload(path, false);
        } catch (Exception ex) {
            if (isUnsupportedMimeType(ex)) {
                return new VisualCropUpload(null, true);
            }
            log.warn("Failed to upload visual crop for document {} page {} element {}: {}",
                    documentId, pageNumber, elementIndex, ex.getMessage());
            return new VisualCropUpload(null, false);
        }
    }

    private static boolean isUnsupportedMimeType(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            String message = current.getMessage();
            if (message != null && message.contains("invalid_mime_type")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static byte[] cropPng(byte[] pagePng, NormalizedBBox bbox) throws Exception {
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(pagePng));
        if (image == null) {
            return pagePng;
        }
        NormalizedBBox safe = bbox != null ? bbox : new NormalizedBBox(0, 0, 1, 1);
        int x = Math.max(0, Math.min(image.getWidth() - 1, (int) Math.floor(safe.x() * image.getWidth())));
        int y = Math.max(0, Math.min(image.getHeight() - 1, (int) Math.floor(safe.y() * image.getHeight())));
        int width = Math.max(1, Math.min(image.getWidth() - x, (int) Math.ceil(safe.width() * image.getWidth())));
        int height = Math.max(1, Math.min(image.getHeight() - y, (int) Math.ceil(safe.height() * image.getHeight())));
        BufferedImage subimage = image.getSubimage(x, y, width, height);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(subimage, "png", baos);
            return baos.toByteArray();
        }
    }

    private String elementMetadataJson(VisualElement element) {
        try {
            return objectMapper.writeValueAsString(elementMetadata(element));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize visual extraction metadata: {}", ex.getMessage());
            return null;
        }
    }

    private Map<String, Object> elementMetadata(VisualElement element) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("type", element.type());
        if (element.title() != null) metadata.put("title", element.title());
        if (element.bbox() != null) metadata.put("bbox", element.bbox());
        if (element.confidence() != null) metadata.put("confidence", element.confidence());
        return metadata;
    }

    private String toJson(JsonNode node) {
        if (node == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize visual extraction JSON: {}", ex.getMessage());
            return null;
        }
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
                if (raw.contains("resume") || raw.contains("résumé") || raw.contains("cv") || raw.contains("curriculum vitae"))
                    return "resume";
                if (raw.contains("catalog") || raw.contains("catalogue") || raw.contains("product") || raw.contains("brochure"))
                    return "catalog";
                return "mixed";
            }
        }
        return null;
    }
}
