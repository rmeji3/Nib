package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import org.springframework.web.client.HttpClientErrorException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final RestClient restClient;

    @Value("${mistral.api.key}")
    private String apiKey;

    @Value("${mistral.api.url:https://api.mistral.ai/v1}")
    private String apiUrl;

    private static final String MODEL = "mistral-embed";
    private static final int MAX_RETRIES = 4;
    private static final long INITIAL_BACKOFF_MS = 2_000;

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
     * Retries with exponential backoff on 429 rate-limit responses.
     */
    @SuppressWarnings("unchecked")
    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) return List.of();

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "input", texts
        );

        Map<String, Object> response = callWithRetry(body);

        if (response == null) throw new RuntimeException("Empty response from Mistral embeddings API");

        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data == null || data.isEmpty()) throw new RuntimeException("No embedding data returned");

        // Sort by index to guarantee ordering matches input list
        data.sort((a, b) -> Integer.compare(
                ((Number) a.get("index")).intValue(),
                ((Number) b.get("index")).intValue()
        ));

        return data.stream().map(item -> {
            List<Double> embedding = (List<Double>) item.get("embedding");
            if (embedding == null) throw new RuntimeException("Null embedding vector in batch response");
            float[] result = new float[embedding.size()];
            for (int i = 0; i < embedding.size(); i++) result[i] = embedding.get(i).floatValue();
            return result;
        }).toList();
    }

    /**
     * Calls the Mistral embeddings API with exponential backoff retry on 429s.
     * Backoff: 2s → 4s → 8s → 16s (total ~30s of waiting before giving up).
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> callWithRetry(Map<String, Object> body) {
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return restClient.post()
                        .uri(apiUrl + "/embeddings")
                        .header("Authorization", "Bearer " + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
            } catch (HttpClientErrorException.TooManyRequests ex) {
                if (attempt == MAX_RETRIES) {
                    log.error("Mistral 429 rate limit: exhausted {} retries, giving up", MAX_RETRIES);
                    throw ex;
                }
                long backoff = INITIAL_BACKOFF_MS * (1L << attempt);
                log.warn("Mistral 429 rate limit — retrying in {}ms (attempt {}/{})",
                        backoff, attempt + 1, MAX_RETRIES);
                try {
                    Thread.sleep(backoff);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during rate-limit backoff", ie);
                }
            }
        }
        throw new RuntimeException("Unreachable — retry loop exited without return or throw");
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
