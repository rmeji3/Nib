package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Text embeddings via Spring AI's EmbeddingModel (Mistral {@code mistral-embed},
 * float[1024]). Spring AI owns the HTTP transport, response parsing, and
 * transient-error retry/backoff (tunable via {@code spring.ai.retry.*}); this
 * service keeps the batch-first contract the ingestion pipeline and chat rely on.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;

    /**
     * Embeds a single text string. Delegates to embedBatch for consistency.
     */
    public float[] embed(String text) {
        return embedBatch(List.of(text)).get(0);
    }

    /**
     * Embeds multiple texts in a single Mistral API call.
     * Dramatically reduces API calls vs. calling embed() per chunk — avoids rate limits.
     * Returns a list of float arrays in the same order as the input list.
     */
    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) return List.of();

        List<float[]> embeddings = embeddingModel.embed(texts);
        if (embeddings == null || embeddings.isEmpty()) {
            throw new RuntimeException("No embedding data returned");
        }
        if (embeddings.size() != texts.size()) {
            throw new RuntimeException("Embedding count mismatch: expected " + texts.size()
                    + " but got " + embeddings.size());
        }
        return embeddings;
    }

    /** Formats a float array into the pgvector string format: [0.1,0.2,...] */
    public static String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(embedding[i]);
        }
        sb.append(']');
        return sb.toString();
    }
}
