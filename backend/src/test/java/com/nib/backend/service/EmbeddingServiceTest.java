package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EmbeddingServiceTest {

    private final EmbeddingModel embeddingModel = mock(EmbeddingModel.class);
    private final EmbeddingService service = new EmbeddingService(embeddingModel);

    @Test
    void embedBatchReturnsEmbeddingsInInputOrder() {
        when(embeddingModel.embed(List.of("first", "second"))).thenReturn(List.of(
                new float[]{0.1f, 0.2f, 0.3f},
                new float[]{0.4f, 0.5f, 0.6f}
        ));

        List<float[]> embeddings = service.embedBatch(List.of("first", "second"));

        assertThat(embeddings).hasSize(2);
        assertThat(embeddings.get(0)).containsExactly(0.1f, 0.2f, 0.3f);
        assertThat(embeddings.get(1)).containsExactly(0.4f, 0.5f, 0.6f);
    }

    @Test
    void embedBatchFailsWhenProviderReturnsWrongCount() {
        when(embeddingModel.embed(List.of("first", "second")))
                .thenReturn(List.of(new float[]{0.1f, 0.2f}));

        assertThatThrownBy(() -> service.embedBatch(List.of("first", "second")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("mismatch");
    }
}
