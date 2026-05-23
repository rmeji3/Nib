package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Renders individual PDF pages to PNG images and sends them to Gemini Vision
 * for multimodal analysis: charts, tables, figures, diagrams, and text.
 *
 * Returns a plain-English description of everything visible on the page,
 * structured so it can be embedded and retrieved alongside text blocks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VisionService {

    private final RestClient restClient;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiApiUrl;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    /**
     * Rendering DPI for the page-to-PNG conversion.
     * 120 is the sweet spot: Gemini Vision reads text/charts cleanly at this
     * resolution, and the render is ~40% faster than at 150 DPI (and the PNG
     * payload to Gemini is smaller, so the HTTP upload is faster too).
     * Don't go below ~100 — small chart axis labels start losing legibility.
     */
    private static final int RENDER_DPI = 120;

    private static final String VISION_PROMPT = """
            Analyze this PDF page and provide a thorough plain-text description of everything visible.

            FIRST — always capture any title, heading, subtitle, logo text, or brand name at the top of the page. \
            State it explicitly at the start of your response (e.g. "This page is titled: X").

            For MENU, PRICE LIST, CATALOG, or any page listing items with prices:
            - List EVERY visible item with its EXACT price, one per line, in this format:
              Item Name | $Price
            - Preserve section headers (e.g. "BURGERS", "WRAPS") as their own lines above their items.
            - Do NOT summarise or omit items. Enumerate every single one.
            - Include any descriptions or ingredient lists if shown, on the same line after the price.
            - Spell out section/category names in FULL — never abbreviate (write "DRINKS" not "DR").

            For CHARTS or GRAPHS:
            - State the chart type (bar, line, pie, scatter, etc.)
            - Give the exact title if visible
            - List axis labels, units, and scale
            - Extract key data points, values, and trends
            - Describe the main takeaway or insight

            For TABLES:
            - Describe the table structure (number of columns, what each column means)
            - List EVERY row with its values — do not skip rows
            - Summarize what the table shows

            For IMAGES or DIAGRAMS:
            - Describe what is depicted
            - Extract any visible text labels or annotations

            For TEXT-HEAVY pages:
            - Extract the exact text of all headings and subheadings
            - Summarize the key points in a few sentences

            Be specific about numbers, percentages, dates, labels, prices, and units you can see.
            Spell every word out in full — never truncate or abbreviate.
            Do NOT use markdown formatting — respond in plain paragraphs or simple lines only.
            """;

    /**
     * Renders the given page (0-indexed) of the provided PDF bytes to a PNG,
     * then calls Gemini Vision to produce a structured description.
     *
     * Returns null if rendering or the API call fails — the caller should skip
     * the visual block for that page rather than failing the entire ingestion.
     *
     * NOTE: this method reloads the entire PDF every call. When processing many
     * pages, prefer rendering with {@link #renderPageFromDocument} (one shared
     * PDDocument) and then calling {@link #analyzeRenderedImage} on each PNG.
     */
    public String analyzePageImage(byte[] pdfBytes, int pageIndex) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            byte[] imageBytes = renderPageFromDocument(doc, pageIndex);
            return analyzeRenderedImage(imageBytes, pageIndex + 1);
        } catch (Exception ex) {
            log.warn("Vision analysis failed for page {}: {}", pageIndex + 1, ex.getMessage());
            return null;
        }
    }

    /**
     * Renders a single page from an already-open PDDocument. Use this when
     * processing many pages so the PDF is only parsed once. PDDocument is NOT
     * thread-safe, so call this serially from one thread.
     */
    public byte[] renderPageFromDocument(PDDocument doc, int pageIndex) throws Exception {
        PDFRenderer renderer = new PDFRenderer(doc);
        BufferedImage image = renderer.renderImageWithDPI(pageIndex, RENDER_DPI, ImageType.RGB);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", baos);
            return baos.toByteArray();
        }
    }

    /**
     * Calls Gemini Vision on a pre-rendered PNG. Safe to call concurrently from
     * many threads — the heavy work is network I/O, not local CPU.
     * Returns null on failure so the caller can skip that page's visual block.
     */
    public String analyzeRenderedImage(byte[] pngBytes, int pageNumberForLog) {
        try {
            String base64 = Base64.getEncoder().encodeToString(pngBytes);
            String description = callGeminiVision(base64);
            log.debug("Vision analysis complete for page {} ({} chars)", pageNumberForLog,
                    description != null ? description.length() : 0);
            return description;
        } catch (Exception ex) {
            log.warn("Vision analysis failed for page {}: {}", pageNumberForLog, ex.getMessage());
            return null;
        }
    }

    /**
     * Generate a dense overview of a document for retrieval by meta-questions
     * like "what is this about" or "what is the name of the company / cafe /
     * paper". This block is added once per document at ingest time and embedded
     * alongside the regular content chunks.
     *
     * Multimodal by design: we send the FIRST PAGE IMAGE alongside the extracted
     * text content. The first page is where titles, logos, brand names, paper
     * titles, contract parties, and cover-art live — and the per-page vision
     * prompt can miss stylised logos when it's also trying to enumerate menu
     * items, table rows, and chart data. Giving the summary model a dedicated
     * look at the cover image plus the full document text guarantees the
     * document's identity is captured.
     *
     * The summary is constrained to start with "TITLE: <name>" so direct queries
     * like "what is the cafe called" embed close to it.
     *
     * Returns null on failure; the caller treats that as "no summary block,
     * continue with text + visual blocks only".
     */
    @SuppressWarnings("unchecked")
    public String generateDocumentSummary(byte[] firstPageImage, String combinedContent) {
        if (combinedContent == null || combinedContent.isBlank()) return null;
        // Cap input so we don't blow the context window on a 200-page report.
        // 16k chars is enough for Gemini to grasp the document's scope without
        // making the API call expensive.
        String trimmed = combinedContent.length() > 16000
                ? combinedContent.substring(0, 16000)
                : combinedContent;

        String prompt = """
                You are creating the definitive overview of this document so that future questions
                about it ("what is this about", "what is the title", "who wrote this", "what cafe
                is this") can find this overview through semantic search.

                You are given TWO inputs:
                  1. An image of the FIRST PAGE of the document — use this to read the title, logo,
                     establishment name, brand, author byline, or any cover-page identity. Look
                     carefully at large text, logos, mastheads, headers, and footers.
                  2. The full extracted text + visual descriptions of the document, below.

                Output format — strict:
                Line 1 must be exactly:
                  TITLE: <the document's title, establishment name, brand, or paper title>
                If the cover page shows a stylised logo (e.g. "Subah Cafe"), use the readable
                brand text exactly as shown. If genuinely no identifying text is visible, write
                "TITLE: Untitled document".

                Line 2 must be exactly:
                  TYPE: <one short noun phrase, e.g. "Cafe menu", "Research paper on liquid cooling",
                          "Quarterly earnings report", "Insurance policy contract", "Restaurant takeout menu">

                Then write a paragraph of 3–5 sentences (separated from the TITLE/TYPE lines by a
                blank line) that captures:
                  • The document's main purpose and audience
                  • The major sections, products, themes, or findings it contains
                  • Any especially notable facts, figures, prices, dates, or conclusions
                  • Names of people, places, or organisations central to the document

                Plain text only. No markdown, no headings, no citations, no bullet points in the
                paragraph (TITLE/TYPE on their own lines are fine).

                Be specific. Prefer concrete nouns ("offers espresso drinks, pastries, sandwiches,
                and salads") over abstractions ("offers various food items").

                === DOCUMENT TEXT + VISUAL DESCRIPTIONS ===
                %s
                === END OF DOCUMENT ===

                SUMMARY:
                """.formatted(trimmed);

        try {
            // Build multimodal payload: image (if available) + prompt text.
            List<Map<String, Object>> parts = new java.util.ArrayList<>();
            if (firstPageImage != null && firstPageImage.length > 0) {
                String base64 = Base64.getEncoder().encodeToString(firstPageImage);
                parts.add(Map.of("inline_data", Map.of(
                        "mime_type", "image/png",
                        "data", base64
                )));
            }
            parts.add(Map.of("text", prompt));

            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", parts)),
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "maxOutputTokens", 768
                    )
            );
            String url = geminiApiUrl + "/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;
            Map<String, Object> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            if (response == null) return null;
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> responseParts = (List<Map<String, Object>>) content.get("parts");
            String summary = (String) responseParts.get(0).get("text");
            log.info("Generated document summary ({} chars from {} chars of text + {} byte image)",
                    summary != null ? summary.length() : 0,
                    trimmed.length(),
                    firstPageImage != null ? firstPageImage.length : 0);
            return summary;
        } catch (Exception ex) {
            log.warn("Document summary generation failed: {}", ex.getMessage());
            return null;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGeminiVision(String base64Image) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(
                                Map.of("inline_data", Map.of(
                                        "mime_type", "image/png",
                                        "data", base64Image
                                )),
                                Map.of("text", VISION_PROMPT)
                        )
                )),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        // 4096 prevents truncation on dense menu/catalog pages.
                        // Earlier 1024 cap was cutting words mid-token (e.g. "DR" instead of "DRINKS").
                        "maxOutputTokens", 4096
                )
        );

        String url = geminiApiUrl + "/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        try {
            Map<String, Object> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) return null;

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");

        } catch (HttpClientErrorException ex) {
            log.warn("Gemini Vision API error {}: {}", ex.getStatusCode(), ex.getMessage());
            return null;
        }
    }
}
