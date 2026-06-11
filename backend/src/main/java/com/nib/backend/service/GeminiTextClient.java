package com.nib.backend.service;

import com.nib.backend.exception.RateLimitException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Text-only Gemini calls on top of Spring AI's ChatModel (Google GenAI).
 *
 * Spring AI owns the HTTP transport and response parsing; this client keeps the
 * Nib-specific generation policy: the primary→fallback model chain, per-model
 * transient retry with backoff, rate-limit mapping to {@link RateLimitException},
 * and the {@link GenerationResult} contract (text + token usage + the model that
 * actually answered) that chat audits and the answer cache depend on.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiTextClient {

    private final ChatModel chatModel;

    @Value("${gemini.model:gemini-2.5-flash-lite}")
    private String geminiModel;

    @Value("${gemini.fallback-models:gemini-2.5-flash}")
    private String fallbackModels;

    @Value("${gemini.retry.max-attempts-per-model:2}")
    private int maxAttemptsPerModel;

    @Value("${gemini.retry.backoff-ms:500}")
    private long retryBackoffMs;

    public record TokenUsage(
            Integer promptTokenCount,
            Integer candidatesTokenCount,
            Integer totalTokenCount
    ) {}

    public record GenerationResult(
            String text,
            TokenUsage tokenUsage,
            String modelVersion
    ) {
        public GenerationResult(String text, TokenUsage tokenUsage) {
            this(text, tokenUsage, null);
        }
    }

    public String generate(String prompt) {
        return generate(prompt, 2048, 0.1);
    }

    public String generate(String prompt, int maxOutputTokens, double temperature) {
        return generateWithMetadata(prompt, maxOutputTokens, temperature).text();
    }

    public GenerationResult generateWithMetadata(String prompt, int maxOutputTokens, double temperature) {
        RuntimeException lastFailure = null;
        for (String model : candidateModels()) {
            int attempts = Math.max(1, maxAttemptsPerModel);
            for (int attempt = 1; attempt <= attempts; attempt++) {
                try {
                    return callModel(prompt, maxOutputTokens, temperature, model);
                } catch (RateLimitException ex) {
                    throw ex;
                } catch (RuntimeException ex) {
                    if (isRateLimit(ex)) {
                        log.warn("Gemini API rate limit hit — check billing/quota at https://ai.dev/rate-limit");
                        throw new RateLimitException(
                                "The AI service quota has been reached. Please enable billing on your Google Cloud project " +
                                        "(console.cloud.google.com) or wait for your daily quota to reset, then try again.");
                    }
                    lastFailure = ex;
                    if (!isTransientFailure(ex) || attempt == attempts) {
                        break;
                    }
                    backoff(model, attempt, ex);
                }
            }
            if (lastFailure != null && isTransientFailure(lastFailure)) {
                log.warn("Gemini model {} failed with transient error; trying next fallback if configured", model);
            } else if (lastFailure != null) {
                throw lastFailure;
            }
        }
        throw lastFailure != null ? lastFailure : new RuntimeException("Gemini generation failed");
    }

    private GenerationResult callModel(String prompt, int maxOutputTokens, double temperature, String model) {
        ChatOptions options = ChatOptions.builder()
                .model(model)
                .temperature(temperature)
                .maxTokens(maxOutputTokens)
                .build();

        ChatResponse response = chatModel.call(new Prompt(prompt, options));
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            throw new RuntimeException("Empty response from Gemini API");
        }
        String text = response.getResult().getOutput().getText();
        if (text == null) {
            throw new RuntimeException("No text in Gemini response");
        }

        String reportedModel = response.getMetadata() == null ? null : response.getMetadata().getModel();
        return new GenerationResult(
                text,
                parseTokenUsage(response),
                reportedModel == null || reportedModel.isBlank() ? model : reportedModel
        );
    }

    private List<String> candidateModels() {
        Set<String> models = new LinkedHashSet<>();
        if (geminiModel != null && !geminiModel.isBlank()) {
            models.add(geminiModel.trim());
        }
        if (fallbackModels != null && !fallbackModels.isBlank()) {
            for (String fallback : fallbackModels.split(",")) {
                if (!fallback.isBlank()) {
                    models.add(fallback.trim());
                }
            }
        }
        return new ArrayList<>(models);
    }

    /**
     * Provider failures surface as Google GenAI SDK exceptions or Spring AI
     * retry exceptions depending on the call path, so classification is done on
     * the status code / status name embedded in the message rather than on
     * exception types.
     */
    private static boolean isRateLimit(RuntimeException ex) {
        String message = ex.getMessage();
        return message != null && (message.contains("429") || message.contains("RESOURCE_EXHAUSTED"));
    }

    private static boolean isTransientFailure(RuntimeException ex) {
        String message = ex.getMessage();
        return message != null && (
                message.contains("500") ||
                message.contains("502") ||
                message.contains("503") ||
                message.contains("504") ||
                message.contains("UNAVAILABLE") ||
                message.contains("DEADLINE_EXCEEDED")
        );
    }

    private void backoff(String model, int attempt, RuntimeException ex) {
        long delay = Math.max(0, retryBackoffMs) * attempt;
        log.warn("Gemini model {} attempt {} failed transiently: {}; retrying in {} ms",
                model, attempt, ex.getMessage(), delay);
        if (delay <= 0) {
            return;
        }
        try {
            Thread.sleep(delay);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while backing off after Gemini failure", interrupted);
        }
    }

    private static TokenUsage parseTokenUsage(ChatResponse response) {
        Usage usage = response.getMetadata() == null ? null : response.getMetadata().getUsage();
        if (usage == null) {
            return new TokenUsage(null, null, null);
        }
        return new TokenUsage(
                usage.getPromptTokens(),
                usage.getCompletionTokens(),
                usage.getTotalTokens()
        );
    }
}
