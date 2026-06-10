package com.nib.backend.service;

import com.nib.backend.exception.RateLimitException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiTextClient {

    private final RestClient restClient;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiApiUrl;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    public record TokenUsage(
            Integer promptTokenCount,
            Integer candidatesTokenCount,
            Integer totalTokenCount
    ) {}

    public record GenerationResult(
            String text,
            TokenUsage tokenUsage
    ) {}

    public String generate(String prompt) {
        return generate(prompt, 2048, 0.1);
    }

    public String generate(String prompt, int maxOutputTokens, double temperature) {
        return generateWithMetadata(prompt, maxOutputTokens, temperature).text();
    }

    @SuppressWarnings("unchecked")
    public GenerationResult generateWithMetadata(String prompt, int maxOutputTokens, double temperature) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", Map.of(
                        "temperature", temperature,
                        "maxOutputTokens", maxOutputTokens
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
        if (parts == null || parts.isEmpty()) throw new RuntimeException("No parts in Gemini response");
        return new GenerationResult(
                (String) parts.get(0).get("text"),
                parseTokenUsage((Map<String, Object>) response.get("usageMetadata"))
        );
    }

    private static TokenUsage parseTokenUsage(Map<String, Object> usageMetadata) {
        if (usageMetadata == null) {
            return new TokenUsage(null, null, null);
        }
        return new TokenUsage(
                intOrNull(usageMetadata.get("promptTokenCount")),
                intOrNull(usageMetadata.get("candidatesTokenCount")),
                intOrNull(usageMetadata.get("totalTokenCount"))
        );
    }

    private static Integer intOrNull(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return null;
    }
}
