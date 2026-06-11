package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Cross-encoder reranking over hybrid-search candidates.
 *
 * Bi-encoder retrieval (pgvector cosine + BM25) scores the query and each chunk
 * independently, which misses fine-grained relevance. A cross-encoder reranker
 * reads the query and chunk together and returns a true relevance score in
 * [0, 1]. ChatService retrieves a wider candidate pool, asks this service to
 * rerank it, and keeps the top-K — falling back to its heuristic rerank when
 * this service is disabled or the provider call fails.
 *
 * The request/response shape matches the Cohere v2 rerank API; Jina's
 * /v1/rerank is wire-compatible, so switching providers only needs
 * RERANKER_API_URL / RERANKER_MODEL / RERANKER_API_KEY changes (including a
 * self-hosted bge-reranker behind a compatible endpoint).
 *
 * The service is disabled (no-op) when no API key is configured, and fails
 * open: any provider error returns Optional.empty() so chat never breaks
 * because of the reranker.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RerankerService {

    private final RestClient restClient;

    @Value("${reranker.api-key:}")
    private String apiKey;

    @Value("${reranker.api-url:https://api.cohere.com/v2/rerank}")
    private String apiUrl;

    @Value("${reranker.model:rerank-v3.5}")
    private String model;

    @Value("${reranker.candidates:40}")
    private int candidatePoolSize;

    @Value("${reranker.max-chunk-chars:2000}")
    private int maxChunkChars;

    /**
     * Minimum best-candidate relevance for the cross-encoder ordering to be
     * trusted. Below this, the reranker is saying "nothing matches" — which on
     * terse queries ("what uni?") is a model failure mode, not a fact about the
     * corpus — so the ordering is noise and the bi-encoder ranking is safer.
     */
    @Value("${reranker.min-top-relevance:0.10}")
    private double minTopRelevance;

    /** A candidate chunk with the cross-encoder relevance score it received. */
    public record ScoredChunk(VectorSearchService.ChunkMatch chunk, double relevanceScore) {}

    public record RerankResult(List<ScoredChunk> scoredChunks) {

        public List<VectorSearchService.ChunkMatch> chunkMatches() {
            return scoredChunks.stream().map(ScoredChunk::chunk).toList();
        }

        /**
         * Confidence signal for ChatService: best score weighted 0.7, mean of
         * the top-3 weighted 0.3 — same shape as the cosine-distance retrieval
         * confidence so the two terms are comparable. Cross-encoder scores are
         * calibrated relevance probabilities, a much stronger signal than
         * bi-encoder distance.
         */
        public double topRelevance() {
            if (scoredChunks.isEmpty()) return 0.0;
            double best = scoredChunks.get(0).relevanceScore();
            int n = Math.min(3, scoredChunks.size());
            double sum = 0.0;
            for (int i = 0; i < n; i++) sum += scoredChunks.get(i).relevanceScore();
            double blended = 0.7 * best + 0.3 * (sum / n);
            return Math.max(0.0, Math.min(1.0, blended));
        }
    }

    /** Reranking is active only when an API key is configured. */
    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** How many hybrid-search candidates ChatService should retrieve for reranking. */
    public int candidatePoolSize() {
        return candidatePoolSize;
    }

    /**
     * Reranks the candidates against the query and returns the top-K by
     * cross-encoder relevance. Returns Optional.empty() when disabled, when
     * there is nothing to rank, or on any provider failure (fail-open).
     */
    @SuppressWarnings("unchecked")
    public Optional<RerankResult> rerank(
            String query,
            List<VectorSearchService.ChunkMatch> candidates,
            int topK
    ) {
        if (!isEnabled() || candidates.isEmpty() || query == null || query.isBlank() || topK <= 0) {
            return Optional.empty();
        }

        List<String> documents = candidates.stream()
                .map(this::documentText)
                .toList();
        Map<String, Object> body = Map.of(
                "model", model,
                "query", query,
                "documents", documents,
                "top_n", Math.min(topK, candidates.size())
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            if (response == null) {
                log.warn("Reranker returned empty response — falling back to heuristic rerank");
                return Optional.empty();
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            if (results == null || results.isEmpty()) {
                log.warn("Reranker response had no results — falling back to heuristic rerank");
                return Optional.empty();
            }

            List<ScoredChunk> scored = new ArrayList<>(results.size());
            for (Map<String, Object> result : results) {
                Number index = (Number) result.get("index");
                Number score = (Number) result.get("relevance_score");
                if (index == null || score == null) continue;
                int i = index.intValue();
                if (i < 0 || i >= candidates.size()) continue;
                scored.add(new ScoredChunk(candidates.get(i), score.doubleValue()));
            }
            if (scored.isEmpty()) {
                log.warn("Reranker results did not map to any candidate — falling back to heuristic rerank");
                return Optional.empty();
            }
            // Providers return results sorted by relevance, but don't rely on it.
            scored.sort((a, b) -> Double.compare(b.relevanceScore(), a.relevanceScore()));
            if (scored.get(0).relevanceScore() < minTopRelevance) {
                log.info("Cross-encoder found no relevant candidate (best={} < floor={}) — "
                                + "keeping bi-encoder ranking instead",
                        String.format("%.3f", scored.get(0).relevanceScore()),
                        String.format("%.3f", minTopRelevance));
                return Optional.empty();
            }
            if (scored.size() > topK) {
                scored = new ArrayList<>(scored.subList(0, topK));
            }
            return Optional.of(new RerankResult(scored));
        } catch (Exception ex) {
            log.warn("Cross-encoder rerank failed — falling back to heuristic rerank: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Text sent to the reranker for one candidate. Page/block-type context helps
     * the cross-encoder judge visual evidence ("chart on page 3") that users
     * often reference by kind rather than content.
     */
    private String documentText(VectorSearchService.ChunkMatch chunk) {
        String text = chunk.extractedText();
        if (text == null || text.isBlank()) {
            text = "(no extracted text)";
        }
        if (text.length() > maxChunkChars) {
            text = text.substring(0, maxChunkChars);
        }
        return "[page " + chunk.pageNumber() + ", " + chunk.blockType() + "] " + text;
    }
}
