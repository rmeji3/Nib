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
import java.util.HashMap;
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

    /**
     * Phase 3 — refusal threshold (post-calibration). If confidence falls below
     * this, we skip the Gemini call and return a canned "not enough info"
     * answer. Calibrated against the new sigmoid: distances ≥ 0.75 (genuinely
     * unrelated) produce confidence ≤ 0.22. Tune against the eval set.
     */
    @Value("${chat.refusal.threshold:0.22}")
    private double refusalThreshold;

    /**
     * Sigmoid steepness for the distance → confidence map. Higher = sharper
     * cutoff between "very relevant" and "not relevant" — 8 produces a curve
     * that rewards distances ≤ 0.4 strongly and punishes distances ≥ 0.7.
     */
    @Value("${chat.confidence.sigmoid-k:8.0}")
    private double confidenceSigmoidK;

    /**
     * The cosine distance at which the sigmoid returns 0.5. Distances below
     * this map to high confidence, above this to low. 0.6 matches the
     * empirical "good match" cutoff cited by RAG calibration research
     * (results above ~0.4 distance are typically borderline; above ~0.6 are
     * usually noise).
     */
    @Value("${chat.confidence.midpoint:0.6}")
    private double confidenceMidpoint;

    /** Phase 3 — re-ranker weights. */
    @Value("${chat.rerank.visual-boost:0.10}")
    private double rerankVisualBoost;

    @Value("${chat.rerank.diversity-penalty:0.05}")
    private double rerankDiversityPenalty;

    private static final Pattern PAGE_CITATION_PATTERN = Pattern.compile("\\[Page (\\d+)]");

    /** Split answer into sentence-ish units for groundedness scoring. */
    private static final Pattern SENTENCE_SPLIT = Pattern.compile("(?<=[.!?])\\s+(?=[A-Z\\[])");

    private static final String REFUSAL_TEXT =
            "I don't have enough information in the indexed pages to answer this confidently. " +
                    "Try rephrasing your question or asking about a topic that appears in this document.";

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

    /**
     * Meta / summary questions where the user wants an overview, not a fact lookup.
     * For these queries page-level citations on every sentence feel noisy and
     * robotic — so the prompt asks for minimal citations (just at the end or when
     * quoting a specific number/name).
     */
    private static final List<String> META_PHRASES = List.of(
            "what is this", "what's this", "what is the document",
            "what is this pdf", "what's this pdf", "what is this document",
            "summarize", "summary", "summarise", "overview",
            "what are the main", "main topics", "key points",
            "tell me about", "describe this", "what does this cover",
            "what is it about", "what's it about", "about this document",
            "brief me", "tldr", "tl;dr", "in a nutshell"
    );

    private static boolean isMetaQuery(String question) {
        String lower = question.toLowerCase().trim();
        for (String phrase : META_PHRASES) {
            if (lower.contains(phrase)) return true;
        }
        return false;
    }

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

        // Phase 3 — re-rank before any aggregation augmentation so we anchor on
        // the genuinely most relevant blocks first, then optionally pad with all
        // visual blocks when the user asks an aggregation question.
        chunks = rerank(chunks);

        // Compute confidence from the (re-ranked) top-k. This is the score the
        // refusal guard and frontend banner both use.
        double confidence = computeConfidence(chunks);
        log.debug("Computed confidence={} for question '{}'", String.format("%.3f", confidence), question);

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

        // ── Refusal guard ────────────────────────────────────────────────────
        // If confidence is below threshold, don't even call Gemini — return a
        // canned response. This kills hallucinations on off-topic queries and
        // saves API spend. Skipped for aggregation queries because they
        // intentionally have weaker per-chunk similarity but legitimate intent.
        if (confidence < refusalThreshold && !isAggregationQuery(question)) {
            log.info("Refusing query: confidence {} below threshold {} (question='{}')",
                    String.format("%.3f", confidence), refusalThreshold, question);

            ChatMessage refusalMsg = chatMessageRepository.save(ChatMessage.builder()
                    .sessionId(sessionId)
                    .role("assistant")
                    .content(REFUSAL_TEXT)
                    .modelVersion(geminiModel)
                    .build());

            return new ChatQueryResponse(
                    refusalMsg.getId(), sessionId, REFUSAL_TEXT, List.of(),
                    geminiModel, refusalMsg.getCreatedAt().toString(),
                    confidence, 0.0, true
            );
        }

        // Build grounded prompt
        String prompt = buildPrompt(question, chunks);

        // Call Gemini
        String answer = callGemini(prompt);

        // Extract citations referenced in the answer
        List<CitationDto> citations = extractCitations(answer, chunks);

        // Phase 3 — citation enforcement / groundedness scoring
        double groundedness = computeGroundedness(answer);
        if (groundedness < 0.5) {
            log.warn("Low groundedness ({}) — answer has citations on fewer than half its sentences",
                    String.format("%.2f", groundedness));
        }

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
                assistantMsg.getCreatedAt().toString(),
                confidence,
                groundedness,
                false
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Phase 3 — re-rank top-k chunks to balance similarity, visual coverage, and
     * page diversity. pgvector's cosine-distance ordering over-favors text
     * similarity; this pass:
     *   • boosts {@code visual_summary} blocks slightly so charts/tables aren't
     *     hidden behind nearby prose;
     *   • penalises duplicate pages so a long page can't dominate the context.
     *
     * Note: pgvector returns cosine distance (0 = identical, 2 = opposite) under
     * the {@code <=>} operator, so similarity in code = (1 - cosineDistance).
     */
    private List<VectorSearchService.ChunkMatch> rerank(List<VectorSearchService.ChunkMatch> chunks) {
        if (chunks.isEmpty()) return chunks;

        // Track pages already counted so duplicates get a growing penalty.
        Map<Integer, Integer> pageCount = new HashMap<>();

        record Scored(VectorSearchService.ChunkMatch chunk, double score) {}
        List<Scored> scored = new ArrayList<>(chunks.size());

        for (VectorSearchService.ChunkMatch c : chunks) {
            double base = 1.0 - c.similarity();                  // similarity in [~-1, 1], clamped below
            double visualBoost = "visual_summary".equals(c.blockType()) ? rerankVisualBoost : 0.0;
            // Document summary blocks get a small static boost so meta-questions
            // ("what is this about", "summarize") that retrieve them at all get
            // them ranked first in the prompt context.
            double summaryBoost = "document_summary".equals(c.blockType()) ? 0.15 : 0.0;
            int seen = pageCount.getOrDefault(c.pageNumber(), 0);
            double diversityPenalty = rerankDiversityPenalty * seen;
            double score = base + visualBoost + summaryBoost - diversityPenalty;
            pageCount.merge(c.pageNumber(), 1, Integer::sum);
            scored.add(new Scored(c, score));
        }

        scored.sort(Comparator.comparingDouble(Scored::score).reversed());
        return scored.stream().map(Scored::chunk).collect(Collectors.toCollection(ArrayList::new));
    }

    /**
     * Phase 3 (calibrated) — compute a [0..1] confidence score from the top-k
     * cosine distances. pgvector returns cosine distance via {@code <=>}: 0
     * means identical, ~1 means orthogonal, 2 means opposite.
     *
     * The earlier linear {@code 1 - meanDistance} was too pessimistic: a
     * perfectly relevant chunk often has distance 0.3-0.4 (because the user's
     * question and the source phrasing are different sentences with similar
     * meaning), and that mapped to only 60-70% — which read as "the system
     * isn't sure" even on easy questions. RAG calibration research consistently
     * puts the "good match" boundary at ~0.4 distance and the "no good match"
     * cutoff at ~0.6 distance.
     *
     * New formula:
     *   1. Sigmoid map per chunk: {@code 1 / (1 + exp(k * (d - midpoint)))}
     *      gives distance 0.3 → 0.92, distance 0.5 → 0.69, distance 0.7 → 0.31.
     *   2. Weight the best (top-1) match at 0.7 and the mean of the top-3 at 0.3.
     *      Rationale: one strong match usually means we found the right info;
     *      the mean acts as a consistency check so a single fluke doesn't claim
     *      certainty.
     */
    private double computeConfidence(List<VectorSearchService.ChunkMatch> chunks) {
        if (chunks.isEmpty()) return 0.0;
        double bestDistance = chunks.get(0).similarity();
        int n = Math.min(3, chunks.size());
        double sum = 0.0;
        for (int i = 0; i < n; i++) sum += chunks.get(i).similarity();
        double meanDistance = sum / n;
        double confBest = sigmoidScore(bestDistance);
        double confMean = sigmoidScore(meanDistance);
        double conf = 0.7 * confBest + 0.3 * confMean;
        return Math.max(0.0, Math.min(1.0, conf));
    }

    /** Map a cosine distance to a [0,1] confidence using a sigmoid curve. */
    private double sigmoidScore(double distance) {
        double exponent = confidenceSigmoidK * (distance - confidenceMidpoint);
        return 1.0 / (1.0 + Math.exp(exponent));
    }

    /**
     * Phase 3 — fraction of answer sentences that contain at least one [Page N]
     * citation. Used as a "did the model actually ground its claims?" signal.
     * 1.0 means every sentence is cited, 0.0 means none.
     */
    private double computeGroundedness(String answer) {
        if (answer == null || answer.isBlank()) return 0.0;
        String[] sentences = SENTENCE_SPLIT.split(answer.trim());
        if (sentences.length == 0) return 0.0;
        int cited = 0;
        int total = 0;
        for (String s : sentences) {
            String trimmed = s.trim();
            if (trimmed.length() < 8) continue; // skip stubs like "OK." or fragments
            total++;
            if (PAGE_CITATION_PATTERN.matcher(trimmed).find()) cited++;
        }
        return total == 0 ? 0.0 : (double) cited / total;
    }

    /**
     * Enterprise-grade prompt structure (informed by 2026 RAG best-practice
     * research: multi-layer prompt with persona/system/few-shot/synthesis):
     *
     *  1. ROLE — primes the model to behave like a senior research analyst,
     *     not a generic chatbot.
     *  2. STRICT GROUNDING RULES — answers must come from the provided context;
     *     anything not present must be refused, not invented.
     *  3. CITATION FORMAT — exact format, with a few-shot example showing the
     *     intended style.
     *  4. CHAIN-OF-THOUGHT — instructs the model to first locate the relevant
     *     pages, then synthesise. This produces more grounded answers than
     *     letting it free-form.
     *  5. NUMERICAL PRECISION — explicit rule to preserve numbers, units, and
     *     dates exactly as written, never rounding or inferring.
     *  6. STRUCTURE GUIDANCE — bullets for lists, prose for explanations.
     *  7. FALLBACK — exact wording when the answer is not in the document.
     */
    private String buildPrompt(String question, List<VectorSearchService.ChunkMatch> chunks) {
        StringBuilder sb = new StringBuilder(8192);
        boolean meta = isMetaQuery(question);

        // ── ROLE ───────────────────────────────────────────────────────────
        sb.append("# Role\n");
        sb.append("You are a senior research analyst at a professional services firm. ");
        sb.append("You read enterprise documents (research papers, reports, contracts, financial filings, ");
        sb.append("technical specifications, menus, catalogues) and produce precise, defensible answers for ");
        sb.append("colleagues who will rely on them in real work. Accuracy and traceability are paramount; ");
        sb.append("speculation is never acceptable.\n\n");

        // ── GROUNDING RULES ────────────────────────────────────────────────
        sb.append("# Grounding Rules\n");
        sb.append("- Answer using ONLY the document content provided in the CONTEXT section below.\n");
        sb.append("- Treat text extracts and visual descriptions as equally authoritative — visual descriptions ");
        sb.append("come from analysing the page image and contain the most accurate reading of charts, tables, ");
        sb.append("figures, and price lists.\n");
        sb.append("- If the answer is not present in the context, respond exactly: ");
        sb.append("\"I cannot find this information in the indexed pages of this document.\" Do not guess.\n");
        sb.append("- Never invent numbers, names, dates, prices, or claims that are not explicitly in the context.\n");
        sb.append("- Quote numerical values, units, dates, percentages, and proper nouns EXACTLY as written. ");
        sb.append("Never round, simplify, or paraphrase a numeric figure.\n\n");

        // ── CITATIONS ──────────────────────────────────────────────────────
        sb.append("# Citation Format\n");
        if (meta) {
            // For summaries and overview questions, inline citations on every sentence
            // feel robotic. Only cite when quoting a specific number, name, or claim
            // that the reader might want to verify.
            sb.append("- This is a summary / overview question. Write naturally without citing every sentence.\n");
            sb.append("- Only add a [Page N] citation when you quote a specific number, date, price, name, ");
            sb.append("or claim that the reader might want to verify.\n");
            sb.append("- If no specific numbers or claims are mentioned, you may omit citations entirely.\n");
        } else {
            sb.append("- Every sentence that states a fact, number, name, or claim MUST end with at least one ");
            sb.append("[Page N] citation, where N is the page number shown in the section header.\n");
        }
        sb.append("- Write each page as its own tag. NEVER combine: write \"[Page 1][Page 2]\", NEVER \"[Page 1, Page 2]\".\n");
        sb.append("- Use the exact format [Page N] — no other citation style is accepted.\n");
        sb.append("- Example of correct citation style:\n");
        sb.append("    The system reached a peak load of 62.4 kW under sustained training [Page 4]. ");
        sb.append("This exceeded the design budget by 95% [Page 4][Page 6].\n\n");

        // ── REASONING APPROACH ─────────────────────────────────────────────
        sb.append("# How to Answer\n");
        sb.append("Before writing the final answer, mentally:\n");
        sb.append("  1. Identify which pages in the context are directly relevant to the question.\n");
        sb.append("  2. Extract the specific facts, figures, or descriptions needed.\n");
        sb.append("  3. Compose a concise, professional answer that cites those pages.\n");
        sb.append("Do NOT write out this reasoning — output only the final answer.\n\n");

        // ── STRUCTURE ──────────────────────────────────────────────────────
        sb.append("# Answer Structure\n");
        sb.append("- For list / enumeration questions (\"what are\", \"list\", \"all the\"): use a bulleted list, ");
        sb.append("one item per line, each with a citation.\n");
        sb.append("- For comparison / aggregation questions (\"most\", \"highest\", \"compare\"): give the ");
        sb.append("specific answer first, then briefly justify with the cited numbers.\n");
        sb.append("- For explanatory questions (\"what is\", \"how does\", \"why\"): write 2-5 sentences of ");
        sb.append("clear prose, each sentence cited.\n");
        sb.append("- For factual lookups (\"what is the X of Y\"): give the direct answer in one sentence, cited.\n");
        sb.append("- Be concise. Do not pad. Do not preface with \"Based on the document...\" — just answer.\n");
        sb.append("- Do not use markdown headings (###). Plain text and bullet points only.\n\n");

        // ── CONTEXT ────────────────────────────────────────────────────────
        sb.append("# Context (Document Content)\n");
        sb.append("The following are the retrieved sections from the document, in order of relevance. ");
        sb.append("Each section is labelled with its page number and content type. ");
        sb.append("If a section is labelled \"(visual description)\" it was produced by analysing the page image ");
        sb.append("and may include readings of charts, tables, prices, and other graphical content.\n\n");

        for (VectorSearchService.ChunkMatch chunk : chunks) {
            String label = switch (chunk.blockType()) {
                case "visual_summary" -> "visual description";
                case "document_summary" -> "document overview";
                default -> "text extract";
            };
            sb.append("--- Page ").append(chunk.pageNumber())
              .append(" (").append(label).append(") ---\n");
            sb.append(chunk.extractedText()).append("\n\n");
        }

        sb.append("# Question\n");
        sb.append(question).append("\n\n");
        sb.append("# Answer\n");
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
                    // Exclude both visual_summary AND document_summary so the citation
                    // excerpt is always real page text, not synthesised content.
                    .filter(c -> "text".equals(c.blockType()))
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
