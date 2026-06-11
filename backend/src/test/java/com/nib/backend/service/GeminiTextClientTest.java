package com.nib.backend.service;

import com.nib.backend.exception.RateLimitException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiTextClientTest {

    private final ChatModel chatModel = mock(ChatModel.class);

    private GeminiTextClient buildClient(String model, String fallbacks) {
        GeminiTextClient client = new GeminiTextClient(chatModel);
        ReflectionTestUtils.setField(client, "geminiModel", model);
        ReflectionTestUtils.setField(client, "fallbackModels", fallbacks);
        ReflectionTestUtils.setField(client, "maxAttemptsPerModel", 1);
        ReflectionTestUtils.setField(client, "retryBackoffMs", 0L);
        return client;
    }

    private static ChatResponse response(String text, String model, Integer prompt, Integer completion, Integer total) {
        return new ChatResponse(
                List.of(new Generation(new AssistantMessage(text))),
                ChatResponseMetadata.builder()
                        .model(model)
                        .usage(new DefaultUsage(prompt, completion, total))
                        .build()
        );
    }

    @Test
    void generateWithMetadataReturnsTextAndTokenUsage() {
        GeminiTextClient client = buildClient("gemini-2.5-flash", "");
        when(chatModel.call(any(Prompt.class)))
                .thenReturn(response("Revenue was $42.3M [B1].", "gemini-2.5-flash", 101, 17, 118));

        GeminiTextClient.GenerationResult result = client.generateWithMetadata("prompt", 2048, 0.1);

        assertThat(result.text()).isEqualTo("Revenue was $42.3M [B1].");
        assertThat(result.tokenUsage().promptTokenCount()).isEqualTo(101);
        assertThat(result.tokenUsage().candidatesTokenCount()).isEqualTo(17);
        assertThat(result.tokenUsage().totalTokenCount()).isEqualTo(118);
        assertThat(result.modelVersion()).isEqualTo("gemini-2.5-flash");

        ArgumentCaptor<Prompt> promptCaptor = ArgumentCaptor.forClass(Prompt.class);
        verify(chatModel).call(promptCaptor.capture());
        assertThat(promptCaptor.getValue().getOptions().getModel()).isEqualTo("gemini-2.5-flash");
        assertThat(promptCaptor.getValue().getOptions().getTemperature()).isEqualTo(0.1);
        assertThat(promptCaptor.getValue().getOptions().getMaxTokens()).isEqualTo(2048);
    }

    @Test
    void generateWithMetadataFallsBackWhenPrimaryModelIsTemporarilyUnavailable() {
        GeminiTextClient client = buildClient("gemini-2.5-flash-lite", "gemini-2.5-flash");
        when(chatModel.call(any(Prompt.class)))
                .thenThrow(new RuntimeException("503 Service Unavailable: model is overloaded"))
                .thenReturn(response("Answer from fallback [B1].", "gemini-2.5-flash", 11, 7, 18));

        GeminiTextClient.GenerationResult result = client.generateWithMetadata("prompt", 2048, 0.1);

        assertThat(result.text()).isEqualTo("Answer from fallback [B1].");
        assertThat(result.modelVersion()).isEqualTo("gemini-2.5-flash");

        ArgumentCaptor<Prompt> promptCaptor = ArgumentCaptor.forClass(Prompt.class);
        verify(chatModel, org.mockito.Mockito.times(2)).call(promptCaptor.capture());
        assertThat(promptCaptor.getAllValues().get(0).getOptions().getModel()).isEqualTo("gemini-2.5-flash-lite");
        assertThat(promptCaptor.getAllValues().get(1).getOptions().getModel()).isEqualTo("gemini-2.5-flash");
    }

    @Test
    void generateWithMetadataMapsQuotaErrorsToRateLimitException() {
        GeminiTextClient client = buildClient("gemini-2.5-flash-lite", "gemini-2.5-flash");
        when(chatModel.call(any(Prompt.class)))
                .thenThrow(new RuntimeException("429 RESOURCE_EXHAUSTED: quota exceeded"));

        assertThatThrownBy(() -> client.generateWithMetadata("prompt", 2048, 0.1))
                .isInstanceOf(RateLimitException.class);
        // Rate limits must not burn the fallback model — only one call expected.
        verify(chatModel, org.mockito.Mockito.times(1)).call(any(Prompt.class));
    }

    @Test
    void generateWithMetadataDoesNotFallBackOnNonTransientErrors() {
        GeminiTextClient client = buildClient("gemini-2.5-flash-lite", "gemini-2.5-flash");
        when(chatModel.call(any(Prompt.class)))
                .thenThrow(new RuntimeException("400 INVALID_ARGUMENT: bad request"));

        assertThatThrownBy(() -> client.generateWithMetadata("prompt", 2048, 0.1))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("400");
        verify(chatModel, org.mockito.Mockito.times(1)).call(any(Prompt.class));
    }
}
