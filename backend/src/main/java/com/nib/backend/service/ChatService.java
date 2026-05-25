package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.BBox;
import com.nib.backend.dto.ChatMessageResponse;
import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.ChatSessionResponse;
import com.nib.backend.dto.CitationDto;
import com.nib.backend.exception.DocumentNotFoundException;
import com.nib.backend.exception.RateLimitException;
import com.nib.backend.model.ChatMessage;
import com.nib.backend.model.ChatSession;
import com.nib.backend.model.User;
import com.nib.backend.repository.ChatMessageRepository;
import com.nib.backend.repository.ChatSessionRepository;
import com.nib.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    private final VectorSearchService vectorSearchService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiApiUrl;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    @Value("${ingestion.top-k:5}")
    private int topK;
    private static final Pattern PAGE_CITATION_PATTERN = Pattern.compile("\\[Page (\\d+)]");

    /**
     * Phrases that signal the user wants to aggregate or compare across the whole
     * document rather than ask about a specific fact. For these queries top-k
     * similarity isn't enough — we need every visual block to be in context so
     * Gemini can rank, count, or list across all pages.
     */
    private static final List<String> AGGREGATION_PHRASES = List.of(
            "most expensive", "least expensive", "cheapest", "priciest",
            "highest price", "lowest price", "price range",
            "all items", "all dishes", "all options", "all the items",
            "list all", "list every", "list everything",
            "entire menu", "whole menu", "full menu", "complete menu", "everything on",
            "full list", "complete list",
            "how many", "total number", "count of",
            "compare", "comparison"
    );

    private static boolean isAggregationQuery(String question) {
        String lower = question.toLowerCase();
        for (String phrase : AGGREGATION_PHRASES) {
            if (lower.contains(phrase)) return true;
        }
        return false;
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    @Transactional
    public ChatSessionResponse getOrCreateSession(UUID documentId, User user) {
        documentRepository.findByIdAndUserAndDeletedAtIsNull(documentId, user)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        List<ChatSession> existing = chatSessionRepository
                .findByDocumentIdAndUserIdOrderByCreatedAtDesc(documentId, user.getId());

        ChatSession session = existing.isEmpty()
                ? chatSessionRepository.save(ChatSession.builder()
                        .documentId(documentId)
                        .userId(user.getId())
                        .build())
                : existing.get(0);

        return toSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID sessionId, User user) {
        chatSessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream().map(this::toMessageResponse).collect(Collectors.toList());
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    @Transactional
    public ChatQueryResponse query(UUID sessionId, String question, User user) {
        ChatSession session = chatSessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        // Save the user turn
        chatMessageRepository.save(ChatMessage.builder()
                .sessionId(sessionId)
                .role("user")
                .content(question)
                .build());

        // Embed the question and retrieve top-k chunks
        float[] queryEmbedding = embeddingService.embed(question);
        List<VectorSearchService.ChunkMatch> chunks = new ArrayList<>(
                vectorSearchService.search(session.getDocumentId(), queryEmbedding, topK));

        // For aggregation queries ("most expensive", "list all", "compare", etc.)
        // top-k similarity may miss pages whose embeddings don't sit close to the
        // query — even though those pages contain items we need to rank or list.
        // Pull every visual block for the document and add any not already retrieved.
        if (isAggregationQuery(question)) {
            Set<UUID> seenBlockIds = chunks.stream()
                    .map(VectorSearchService.ChunkMatch::blockId)
                    .collect(Collectors.toCollection(HashSet::new));
            List<VectorSearchService.ChunkMatch> allVisuals =
                    vectorSearchService.getAllVisualBlocks(session.getDocumentId());
            int added = 0;
            for (VectorSearchService.ChunkMatch v : allVisuals) {
                if (seenBlockIds.add(v.blockId())) {
                    chunks.add(v);
                    added++;
                }
            }
            chunks.sort(Comparator.comparingInt(VectorSearchService.ChunkMatch::pageNumber)
                    .thenComparingInt(VectorSearchService.ChunkMatch::chunkIndex));
            log.info("Aggregation query detected — added {} extra visual block(s); {} total chunks in context",
                    added, chunks.size());
        }

        // Build grounded prompt
        String prompt = buildPrompt(question, chunks);

        // Call Gemini
        String answer = callGemini(prompt);

        // Extract citations referenced in the answer
        List<CitationDto> citations = extractCitations(answer, chunks);

        // Persist the assistant turn
        ChatMessage assistantMsg = chatMessageRepository.save(ChatMessage.builder()
                .sessionId(sessionId)
                .role("assistant")
                .content(answer)
                .citations(serializeCitations(citations))
                .modelVersion(geminiModel)
                .build());

        return new ChatQueryResponse(
                assistantMsg.getId(),
                sessionId,
                answer,
                citations,
                geminiModel,
                assistantMsg.getCreatedAt().toString()
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildPrompt(String question, List<VectorSearchService.ChunkMatch> chunks) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a document Q&A assistant. Answer the user's question using ONLY the document content provided below.\n\n");
        sb.append("Rules:\n");
        sb.append("1. Use information from ALL content sections — text extracts and visual descriptions are equally authoritative.\n");
        sb.append("2. Cite every factual claim with [Page X] where X is the page number shown in the section header. " +
                  "Write each page as its own separate tag — NEVER combine them: write [Page 1][Page 2] not [Page 1, Page 2].\n");
        sb.append("3. When referencing a chart, table, or figure, describe what it shows and cite the page.\n");
        sb.append("4. If the answer cannot be found in the provided content, respond: \"I don't have enough information in the retrieved sections to answer this question.\"\n");
        sb.append("5. Be concise and accurate. Your citation format must be exactly [Page X] — nothing else.\n\n");
        sb.append("=== DOCUMENT CONTENT ===\n");

        for (VectorSearchService.ChunkMatch chunk : chunks) {
            boolean isVisual = "visual_summary".equals(chunk.blockType());
            sb.append("\n--- Page ").append(chunk.pageNumber())
              .append(isVisual ? " (visual description)" : " (text extract)")
              .append(" ---\n");
            sb.append(chunk.extractedText()).append("\n");
        }

        sb.append("\n=== END OF DOCUMENT CONTENT ===\n");
        sb.append("\nQuestion: ").append(question).append("\n\nAnswer:");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String callGemini(String prompt) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "maxOutputTokens", 2048
                )
        );

        String url = geminiApiUrl + "/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (HttpClientErrorException.TooManyRequests ex) {
            log.warn("Gemini API rate limit hit — check billing/quota at https://ai.dev/rate-limit");
            throw new RateLimitException(
                    "The AI service quota has been reached. Please enable billing on your Google Cloud project " +
                    "(console.cloud.google.com) or wait for your daily quota to reset, then try again.");
        } catch (HttpClientErrorException ex) {
            log.error("Gemini API HTTP error {}: {}", ex.getStatusCode(), ex.getMessage());
            throw new RuntimeException("Gemini API returned error " + ex.getStatusCode().value() + ": " + ex.getMessage());
        }

        if (response == null) throw new RuntimeException("Empty response from Gemini API");

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        if (candidates == null || candidates.isEmpty()) throw new RuntimeException("No candidates in Gemini response");

        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    private List<CitationDto> extractCitations(String answer, List<VectorSearchService.ChunkMatch> chunks) {
        List<CitationDto> citations = new ArrayList<>();
        Matcher matcher = PAGE_CITATION_PATTERN.matcher(answer);

        while (matcher.find()) {
            int pageNumber = Integer.parseInt(matcher.group(1));
            boolean alreadyAdded = citations.stream()
                    .anyMatch(existing -> existing.pageNumber() == pageNumber);
            if (alreadyAdded) continue;

            // Surface both kinds of evidence for the page so the evidence drawer
            // can show them side by side:
            //   textExcerpt   — from a meaningful (≥30 chars) text block
            //   visualSummary — from the Gemini Vision visual_summary block
            // bbox is taken from whichever block we chose to anchor the highlight on,
            // preferring the text block (more precise) over the page-level visual block.

            Optional<VectorSearchService.ChunkMatch> textBlock = chunks.stream()
                    .filter(c -> c.pageNumber() == pageNumber)
                    .filter(c -> !"visual_summary".equals(c.blockType()))
                    .filter(c -> c.extractedText() != null && c.extractedText().trim().length() >= 30)
                    .findFirst();

            Optional<VectorSearchService.ChunkMatch> visualBlock = chunks.stream()
                    .filter(c -> c.pageNumber() == pageNumber)
                    .filter(c -> "visual_summary".equals(c.blockType()))
                    .findFirst();

            // Fallback: if neither qualified, take literally anything for this page
            VectorSearchService.ChunkMatch anchor = textBlock.orElse(
                    visualBlock.orElse(chunks.stream()
                            .filter(c -> c.pageNumber() == pageNumber)
                            .findFirst().orElse(null)));
            if (anchor == null) continue;

            String textExcerpt = textBlock.map(c -> truncate(c.extractedText(), 280)).orElse(null);
            String visualSummary = visualBlock.map(c -> truncate(c.extractedText(), 600)).orElse(null);

            // Anchor's bbox drives the viewer overlay
            BBox bbox = anchor.bbox();
            Double pageWidth = anchor.pageWidth();
            Double pageHeight = anchor.pageHeight();

            citations.add(new CitationDto(pageNumber, textExcerpt, visualSummary, bbox, pageWidth, pageHeight));
        }
        return citations;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) + "…" : s;
    }

    private String serializeCitations(List<CitationDto> citations) {
        if (citations == null || citations.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(citations);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize citations", ex);
            return null;
        }
    }

    private List<CitationDto> deserializeCitations(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException ex) {
            log.warn("Failed to deserialize citations", ex);
            return List.of();
        }
    }

    private ChatSessionResponse toSessionResponse(ChatSession s) {
        return new ChatSessionResponse(s.getId(), s.getDocumentId(), s.getTitle(),
                s.getCreatedAt().toString());
    }

    private ChatMessageResponse toMessageResponse(ChatMessage m) {
        return new ChatMessageResponse(m.getId(), m.getRole(), m.getContent(),
                deserializeCitations(m.getCitations()), m.getCreatedAt().toString());
    }
}
