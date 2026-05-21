package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.List;
import java.util.Map;
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
        List<VectorSearchService.ChunkMatch> chunks = vectorSearchService.search(
                session.getDocumentId(), queryEmbedding, topK);

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
        sb.append("The content includes two types of blocks:\n");
        sb.append("  - [Page X - text]: extracted text from that page.\n");
        sb.append("  - [Page X - visual]: an AI description of charts, tables, figures, or images on that page.\n\n");
        sb.append("Rules:\n");
        sb.append("1. Use information from BOTH text and visual blocks — they are equally authoritative.\n");
        sb.append("2. Cite every factual claim with [Page X] where X is the page number.\n");
        sb.append("3. When referencing a chart, table, or figure, describe what it shows and cite the page.\n");
        sb.append("4. If the answer cannot be found in the provided content, respond: \"I don't have enough information in the retrieved sections to answer this question.\"\n");
        sb.append("5. Be concise and accurate.\n\n");
        sb.append("Document content:\n");

        for (VectorSearchService.ChunkMatch chunk : chunks) {
            boolean isVisual = "visual_summary".equals(chunk.blockType());
            sb.append("\n[Page ").append(chunk.pageNumber())
              .append(isVisual ? " - visual]:\n" : " - text]:\n");
            sb.append(chunk.extractedText()).append("\n");
        }

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
            chunks.stream()
                    .filter(c -> c.pageNumber() == pageNumber)
                    .findFirst()
                    .ifPresent(c -> {
                        // Deduplicate by page number
                        boolean alreadyAdded = citations.stream()
                                .anyMatch(existing -> existing.pageNumber() == pageNumber);
                        if (!alreadyAdded) {
                            String excerpt = c.extractedText().length() > 200
                                    ? c.extractedText().substring(0, 200) + "…"
                                    : c.extractedText();
                            citations.add(new CitationDto(pageNumber, excerpt));
                        }
                    });
        }
        return citations;
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
