package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiApiUrl;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    /** Rendering DPI — 150 gives a clear image without bloating request size. */
    private static final int RENDER_DPI = 150;

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

    private static final String STRUCTURED_VISION_PROMPT = """
            Analyze this PDF page for multimodal question answering. Return ONLY valid JSON with this exact shape:
            {
              "pageSummary": "one concise page-level visual summary",
              "elements": [
                {
                  "type": "table|chart|figure",
                  "title": "visible title or null",
                  "summary": "what this element shows",
                  "bbox": {"x": 0.0, "y": 0.0, "width": 1.0, "height": 1.0},
                  "tableStructure": {
                    "columns": ["column names"],
                    "rows": [{"Column": "Value"}],
                    "notes": "structure notes or null"
                  },
                  "chartSummary": "chart-specific takeaway or null",
                  "axisLabels": {"x": "label or null", "y": "label or null", "series": "label or null"},
                  "units": {"x": "unit or null", "y": "unit or null", "values": "unit or null"},
                  "dataPoints": [{"label": "series/category/date", "x": "value", "y": "value", "unit": "unit or null"}],
                  "caption": "caption or visible label text or null",
                  "confidence": 0.0
                }
              ]
            }

            Rules:
            - Include a separate element for every table, chart/graph, and meaningful figure/diagram/image.
            - For tables, preserve headers and every visible row. Use null for chart-only fields.
            - For charts, extract axis labels, units, legend/series names, and visible data points when readable.
            - For figures, include labels, annotations, caption text, and a practical summary. Use null for table/chart-only fields.
            - bbox must be normalized page coordinates from 0 to 1, with origin at top-left. If unsure, use the full page bbox.
            - Do not include markdown, code fences, comments, or prose outside the JSON.
            """;

    public record VisualExtractionResult(
            String pageSummary,
            List<VisualElement> elements,
            String rawJson
    ) {}

    public record VisualElement(
            String type,
            String title,
            String summary,
            NormalizedBBox bbox,
            JsonNode tableStructure,
            String chartSummary,
            JsonNode axisLabels,
            JsonNode units,
            JsonNode dataPoints,
            String caption,
            Double confidence
    ) {}

    public record NormalizedBBox(
            double x,
            double y,
            double width,
            double height
    ) {}

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

    public VisualExtractionResult analyzeRenderedImageStructured(byte[] pngBytes, int pageNumberForLog) {
        try {
            String base64 = Base64.getEncoder().encodeToString(pngBytes);
            String rawJson = callGeminiVision(base64, STRUCTURED_VISION_PROMPT, 4096);
            VisualExtractionResult result = parseStructuredVision(rawJson);
            log.debug("Structured vision analysis complete for page {} ({} elements)",
                    pageNumberForLog, result.elements().size());
            return result;
        } catch (Exception ex) {
            log.warn("Structured vision analysis failed for page {}: {}", pageNumberForLog, ex.getMessage());
            return null;
        }
    }

    /**
     * Generates a concise document-level summary for embedding, using Gemini.
     * When a first-page image is available, the call is multimodal (image + text)
     * so titles, logos, and graphical headers that text extraction misses are
     * captured. Falls back to text-only when the image is null.
     *
     * The summary MUST include a "TYPE: &lt;category&gt;" line (second line) so
     * {@code IngestionRunner.extractDocType()} can classify the document.
     */
    @SuppressWarnings("unchecked")
    public String generateDocumentSummary(byte[] firstPageImage, String combinedText) {
        String truncated = combinedText.length() > 12_000
                ? combinedText.substring(0, 12_000) + "\n[...truncated...]"
                : combinedText;

        String summaryPrompt = """
                You are analysing a PDF document. Produce a summary that answers \
                "what is this document about?".

                You MUST follow this EXACT format (no markdown, no extra lines):

                Line 1: A one-sentence overview of the document.
                Line 2: TYPE: <document category phrase>
                Line 3+: 2-3 sentences with the most important facts, names, or numbers.

                The TYPE line is MANDATORY. Examples of correct TYPE lines:
                TYPE: Cafe menu
                TYPE: Research paper on liquid cooling
                TYPE: Financial quarterly report
                TYPE: Legal services agreement
                TYPE: Product catalog
                TYPE: Technical specification

                Here is the document text (may be truncated):
                ---
                """ + truncated + "\n---";

        try {
            List<Object> parts = new java.util.ArrayList<>();

            // If we have a first-page image, include it so Gemini can read titles/logos
            if (firstPageImage != null) {
                String base64 = Base64.getEncoder().encodeToString(firstPageImage);
                parts.add(Map.of("inline_data", Map.of(
                        "mime_type", "image/png",
                        "data", base64
                )));
            }
            parts.add(Map.of("text", summaryPrompt));

            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", parts)),
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "maxOutputTokens", 512
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
            log.info("Generated document summary ({} chars)", summary != null ? summary.length() : 0);
            return summary;
        } catch (Exception ex) {
            log.warn("Document summary generation failed: {}", ex.getMessage());
            return null;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGeminiVision(String base64Image) {
        return callGeminiVision(base64Image, VISION_PROMPT, 4096);
    }

    @SuppressWarnings("unchecked")
    private String callGeminiVision(String base64Image, String prompt, int maxOutputTokens) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(
                                Map.of("inline_data", Map.of(
                                        "mime_type", "image/png",
                                        "data", base64Image
                                )),
                                Map.of("text", prompt)
                        )
                )),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "maxOutputTokens", maxOutputTokens
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

    private VisualExtractionResult parseStructuredVision(String rawJson) throws JsonProcessingException {
        if (rawJson == null || rawJson.isBlank()) {
            return new VisualExtractionResult(null, List.of(), "{}");
        }

        String json = stripJsonFences(rawJson);
        JsonNode root = objectMapper.readTree(json);
        String pageSummary = textOrNull(root.get("pageSummary"));
        JsonNode elementsNode = root.get("elements");
        List<VisualElement> elements = new java.util.ArrayList<>();
        if (elementsNode != null && elementsNode.isArray()) {
            for (JsonNode element : elementsNode) {
                String type = normalizedType(textOrNull(element.get("type")));
                if (type == null) {
                    continue;
                }
                elements.add(new VisualElement(
                        type,
                        textOrNull(element.get("title")),
                        textOrNull(element.get("summary")),
                        bboxOrFullPage(element.get("bbox")),
                        nullableJson(element.get("tableStructure")),
                        textOrNull(element.get("chartSummary")),
                        nullableJson(element.get("axisLabels")),
                        nullableJson(element.get("units")),
                        nullableJson(element.get("dataPoints")),
                        textOrNull(element.get("caption")),
                        doubleOrNull(element.get("confidence"))
                ));
            }
        }
        return new VisualExtractionResult(pageSummary, elements, json);
    }

    private static String stripJsonFences(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    private static String normalizedType(String raw) {
        if (raw == null) return null;
        String lower = raw.toLowerCase();
        if (lower.contains("table")) return "table";
        if (lower.contains("chart") || lower.contains("graph") || lower.contains("plot")) return "chart";
        if (lower.contains("figure") || lower.contains("image") || lower.contains("diagram")) return "figure";
        return null;
    }

    private static NormalizedBBox bboxOrFullPage(JsonNode node) {
        if (node == null || !node.isObject()) {
            return new NormalizedBBox(0, 0, 1, 1);
        }
        double x = clamp01(numberOrDefault(node.get("x"), 0));
        double y = clamp01(numberOrDefault(node.get("y"), 0));
        double width = clamp01(numberOrDefault(node.get("width"), 1));
        double height = clamp01(numberOrDefault(node.get("height"), 1));
        if (width <= 0 || height <= 0) {
            return new NormalizedBBox(0, 0, 1, 1);
        }
        if (x + width > 1) width = 1 - x;
        if (y + height > 1) height = 1 - y;
        return new NormalizedBBox(x, y, width, height);
    }

    private static double numberOrDefault(JsonNode node, double fallback) {
        return node != null && node.isNumber() ? node.asDouble() : fallback;
    }

    private static double clamp01(double value) {
        return Math.max(0, Math.min(1, value));
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) return null;
        String value = node.asText(null);
        return value == null || value.isBlank() ? null : value;
    }

    private static JsonNode nullableJson(JsonNode node) {
        if (node == null || node.isNull() || (node.isContainerNode() && node.isEmpty())) {
            return null;
        }
        return node;
    }

    private static Double doubleOrNull(JsonNode node) {
        return node != null && node.isNumber() ? node.asDouble() : null;
    }
}
