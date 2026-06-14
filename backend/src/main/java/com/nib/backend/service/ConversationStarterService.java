package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.ChatStarterResponse;
import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds document-aware chat conversation starters. Tailored prompts are generated
 * once at ingestion from the document summary and cached on the summary block's
 * {@code extraction_metadata}. Template fallbacks remain for legacy documents.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationStarterService {

    private static final int MAX_STARTERS = 4;
    private static final Pattern JSON_ARRAY_PATTERN = Pattern.compile("\\[[\\s\\S]*\\]");

    private final GeminiTextClient geminiTextClient;
    private final ObjectMapper objectMapper;

    public record DocumentSignals(
            boolean hasTables,
            boolean hasCharts,
            boolean hasFigures
    ) {}

    public DocumentSignals signalsFromBlocks(List<ContentBlock> blocks) {
        return new DocumentSignals(
                hasBlockType(blocks, "table"),
                hasBlockType(blocks, "chart"),
                hasBlockType(blocks, "figure") || hasBlockType(blocks, "visual_summary")
        );
    }

    public DocumentSignals signalsFromBlockTypes(List<String> blockTypes) {
        return new DocumentSignals(
                blockTypes.contains("table"),
                blockTypes.contains("chart"),
                blockTypes.contains("figure") || blockTypes.contains("visual_summary")
        );
    }

    public String toExtractionMetadata(List<ChatStarterResponse> starters) {
        try {
            return objectMapper.writeValueAsString(
                    java.util.Map.of("conversationStarters", normalizeStarters(starters))
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize conversation starters", ex);
        }
    }

    public List<ChatStarterResponse> resolveStarters(Document document, List<ContentBlock> blocks) {
        Optional<ContentBlock> summaryBlock = blocks.stream()
                .filter(block -> "document_summary".equals(block.getBlockType()))
                .findFirst();

        List<ChatStarterResponse> stored = summaryBlock
                .flatMap(block -> parseStoredStarters(block.getExtractionMetadata()))
                .orElse(List.of());
        if (!stored.isEmpty()) {
            return stored;
        }

        String summaryText = summaryBlock.map(ContentBlock::getExtractedText).orElse("");
        if (summaryText != null && !summaryText.isBlank()) {
            DocumentSignals signals = signalsFromBlocks(blocks);
            List<ChatStarterResponse> tailored = generateTailoredStarters(
                    summaryText,
                    document.getDocType(),
                    document.getPageCount(),
                    document.getOriginalFilename(),
                    signals
            );
            if (!tailored.isEmpty()) {
                return tailored;
            }
        }

        return buildTemplateStarters(document, blocks);
    }

    public List<ChatStarterResponse> generateTailoredStarters(
            String summary,
            String docType,
            Integer pageCount,
            String filename,
            DocumentSignals signals
    ) {
        if (summary == null || summary.isBlank()) {
            return List.of();
        }

        String prompt = buildGenerationPrompt(summary, docType, pageCount, filename, signals);
        try {
            String raw = geminiTextClient.generate(prompt, 768, 0.4);
            List<ChatStarterResponse> parsed = parseGeneratedStarters(raw);
            if (parsed.isEmpty()) {
                log.warn("Gemini returned no usable conversation starters");
                return List.of();
            }
            return normalizeStarters(parsed);
        } catch (Exception ex) {
            log.warn("Conversation starter generation failed: {}", ex.getMessage());
            return List.of();
        }
    }

    public Optional<List<ChatStarterResponse>> parseStoredStarters(String extractionMetadata) {
        if (extractionMetadata == null || extractionMetadata.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode root = objectMapper.readTree(extractionMetadata);
            JsonNode startersNode = root.get("conversationStarters");
            if (startersNode == null || !startersNode.isArray()) {
                return Optional.empty();
            }
            List<ChatStarterResponse> parsed = objectMapper.convertValue(
                    startersNode,
                    new TypeReference<List<ChatStarterResponse>>() {}
            );
            List<ChatStarterResponse> normalized = normalizeStarters(parsed);
            return normalized.isEmpty() ? Optional.empty() : Optional.of(normalized);
        } catch (Exception ex) {
            log.warn("Failed to parse stored conversation starters: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    List<ChatStarterResponse> buildTemplateStarters(Document document, List<ContentBlock> blocks) {
        List<ChatStarterResponse> starters = new ArrayList<>();
        String docType = document.getDocType() == null ? "" : document.getDocType().toLowerCase(Locale.ROOT);
        int pageCount = document.getPageCount() == null ? 0 : document.getPageCount();
        DocumentSignals signals = signalsFromBlocks(blocks);
        Optional<ContentBlock> summary = blocks.stream()
                .filter(block -> "document_summary".equals(block.getBlockType()))
                .findFirst();

        addStarter(starters, "Give me the executive summary.", "sparkles");

        if ("resume".equals(docType) || summaryText(summary).toLowerCase(Locale.ROOT).contains("resume")) {
            addStarter(starters, "What are the strongest qualifications in this resume?", "search");
            addStarter(starters, "Summarize the work experience and key projects.", "sparkles");
            addStarter(starters, "What technical skills are listed?", "search");
        } else if ("financial".equals(docType)) {
            addStarter(starters, "What are the key financial figures and trends?", "search");
            addStarter(starters, "Compare the most important period-over-period changes.", "sparkles");
        } else if ("legal".equals(docType)) {
            addStarter(starters, "What obligations and deadlines does this document mention?", "search");
            addStarter(starters, "List the important clauses and what each says.", "sparkles");
        } else if ("technical".equals(docType)) {
            addStarter(starters, "What are the main technical requirements?", "search");
            addStarter(starters, "Explain the architecture or workflow described here.", "sparkles");
        } else if ("academic".equals(docType)) {
            addStarter(starters, "What is the paper's main finding?", "search");
            addStarter(starters, "What methods and evidence support the conclusion?", "sparkles");
        } else if ("menu".equals(docType)) {
            addStarter(starters, "What are the most expensive and cheapest items?", "search");
            addStarter(starters, "List the menu sections with representative prices.", "sparkles");
        } else if ("catalog".equals(docType)) {
            addStarter(starters, "What product categories or sections does this catalog cover?", "search");
            addStarter(starters, "Highlight standout items, specs, or pricing called out here.", "sparkles");
        } else {
            addStarter(starters, "What are the most important details in this document?", "search");
        }

        if (signals.hasTables()) {
            addStarter(starters, "What tables are in this document, and what do they show?", "search");
        }
        if (signals.hasCharts()) {
            addStarter(starters, "Explain the charts and the main data points.", "sparkles");
        }
        if (signals.hasFigures()) {
            addStarter(starters, "What figures or visuals should I pay attention to?", "sparkles");
        }
        if (pageCount > 1) {
            addStarter(starters, "Walk me through the document page by page.", "search");
        }

        return normalizeStarters(starters);
    }

    private String buildGenerationPrompt(
            String summary,
            String docType,
            Integer pageCount,
            String filename,
            DocumentSignals signals
    ) {
        StringBuilder sb = new StringBuilder(4096);
        sb.append("""
                You suggest opening questions for a PDF chat assistant.
                Generate exactly 4 conversation starter questions tailored to THIS document.

                Rules:
                - Each question must be specific to the document summary below (names, topics, figures, numbers, sections).
                - Do NOT use generic prompts like "What are the most important details?" or "Give me the executive summary."
                - Questions must be answerable from the indexed document content.
                - Use natural, concise phrasing (under 120 characters each).
                - Mix overview and specific-fact questions.
                - Return ONLY a JSON array with objects {"prompt":"...", "icon":"search"|"sparkles"}.
                - No markdown fences or commentary.

                Document metadata:
                """);
        if (filename != null && !filename.isBlank()) {
            sb.append("- Filename: ").append(filename.trim()).append('\n');
        }
        if (docType != null && !docType.isBlank()) {
            sb.append("- Category: ").append(docType.trim()).append('\n');
        }
        if (pageCount != null && pageCount > 0) {
            sb.append("- Pages: ").append(pageCount).append('\n');
        }
        sb.append("- Contains tables: ").append(signals.hasTables()).append('\n');
        sb.append("- Contains charts: ").append(signals.hasCharts()).append('\n');
        sb.append("- Contains figures/visuals: ").append(signals.hasFigures()).append("\n\n");
        sb.append("Document summary:\n---\n");
        sb.append(summary.trim());
        sb.append("\n---\n");
        return sb.toString();
    }

    private List<ChatStarterResponse> parseGeneratedStarters(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String trimmed = raw.trim();
        Matcher matcher = JSON_ARRAY_PATTERN.matcher(trimmed);
        if (!matcher.find()) {
            return List.of();
        }
        try {
            List<ChatStarterResponse> parsed = objectMapper.readValue(
                    matcher.group(),
                    new TypeReference<List<ChatStarterResponse>>() {}
            );
            return parsed.stream()
                    .filter(starter -> starter.prompt() != null && !starter.prompt().isBlank())
                    .filter(starter -> !isGenericPrompt(starter.prompt()))
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to parse generated conversation starters: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<ChatStarterResponse> normalizeStarters(List<ChatStarterResponse> starters) {
        List<ChatStarterResponse> normalized = new ArrayList<>();
        for (ChatStarterResponse starter : starters) {
            if (starter == null || starter.prompt() == null) continue;
            String prompt = starter.prompt().replaceAll("\\s+", " ").trim();
            if (prompt.isEmpty()) continue;
            String icon = normalizeIcon(starter.icon());
            boolean duplicate = normalized.stream()
                    .anyMatch(existing -> existing.prompt().equalsIgnoreCase(prompt));
            if (!duplicate) {
                normalized.add(new ChatStarterResponse(prompt, icon));
            }
            if (normalized.size() >= MAX_STARTERS) break;
        }
        return normalized;
    }

    private static String normalizeIcon(String icon) {
        if (icon == null) return "sparkles";
        String trimmed = icon.trim().toLowerCase(Locale.ROOT);
        return "search".equals(trimmed) ? "search" : "sparkles";
    }

    private static boolean isGenericPrompt(String prompt) {
        String lower = prompt.toLowerCase(Locale.ROOT);
        return lower.contains("most important details")
                || lower.contains("executive summary")
                || lower.contains("pay attention to in tables or visuals")
                || lower.equals("walk me through the document page by page.");
    }

    private static boolean hasBlockType(List<ContentBlock> blocks, String blockType) {
        return blocks.stream().anyMatch(block -> blockType.equals(block.getBlockType()));
    }

    private static String summaryText(Optional<ContentBlock> summary) {
        return summary.map(ContentBlock::getExtractedText).orElse("");
    }

    private static void addStarter(List<ChatStarterResponse> starters, String prompt, String icon) {
        boolean duplicate = starters.stream().anyMatch(existing -> existing.prompt().equalsIgnoreCase(prompt));
        if (!duplicate) {
            starters.add(new ChatStarterResponse(prompt, icon));
        }
    }
}
