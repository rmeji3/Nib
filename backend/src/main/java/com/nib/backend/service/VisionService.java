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

    /** Rendering DPI — 150 gives a clear image without bloating request size. */
    private static final int RENDER_DPI = 150;

    private static final String VISION_PROMPT = """
            Analyze this PDF page and provide a thorough plain-text description of everything visible.

            For CHARTS or GRAPHS:
            - State the chart type (bar, line, pie, scatter, etc.)
            - Give the exact title if visible
            - List axis labels, units, and scale
            - Extract key data points, values, and trends
            - Describe the main takeaway or insight

            For TABLES:
            - Describe the table structure (number of columns, what each column means)
            - List the most important rows and values
            - Summarize what the table shows

            For IMAGES or DIAGRAMS:
            - Describe what is depicted
            - Extract any visible text labels or annotations

            For TEXT-HEAVY pages:
            - Summarize the key points in a few sentences

            Be specific about numbers, percentages, dates, labels, and units you can see.
            Do NOT use markdown formatting — respond in plain paragraphs only.
            """;

    /**
     * Renders the given page (0-indexed) of the provided PDF bytes to a PNG,
     * then calls Gemini Vision to produce a structured description.
     *
     * Returns null if rendering or the API call fails — the caller should skip
     * the visual block for that page rather than failing the entire ingestion.
     */
    public String analyzePageImage(byte[] pdfBytes, int pageIndex) {
        try {
            byte[] imageBytes = renderPage(pdfBytes, pageIndex);
            String base64 = Base64.getEncoder().encodeToString(imageBytes);
            String description = callGeminiVision(base64);
            log.debug("Vision analysis complete for page {} ({} chars)", pageIndex + 1,
                    description != null ? description.length() : 0);
            return description;
        } catch (Exception ex) {
            log.warn("Vision analysis failed for page {}: {}", pageIndex + 1, ex.getMessage());
            return null;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private byte[] renderPage(byte[] pdfBytes, int pageIndex) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            BufferedImage image = renderer.renderImageWithDPI(pageIndex, RENDER_DPI, ImageType.RGB);
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                ImageIO.write(image, "png", baos);
                return baos.toByteArray();
            }
        }
    }

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
                        "maxOutputTokens", 1024
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
