package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

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

    /**
     * Embeds a single text string using Mistral's embedding API.
     * Returns a float array of dimension 1024.
     */
    @SuppressWarnings("unchecked")
    public float[] embed(String text) {
        Map<String, Object> body = Map.of(
                "model", MODEL,
                "input", List.of(text)
        );

        Map<String, Object> response = restClient.post()
                .uri(apiUrl + "/embeddings")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null) throw new RuntimeException("Empty response from Mistral embeddings API");

        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data == null || data.isEmpty()) throw new RuntimeException("No embedding data returned");

        List<Double> embedding = (List<Double>) data.get(0).get("embedding");
        if (embedding == null) throw new RuntimeException("Null embedding vector returned");

        float[] result = new float[embedding.size()];
        for (int i = 0; i < embedding.size(); i++) {
            result[i] = embedding.get(i).floatValue();
        }
        return result;
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
