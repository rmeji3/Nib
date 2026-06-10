package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class EmbeddingServiceTest {

    @Test
    void embedBatchParsesMistralEmbeddingsInInputOrder() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        EmbeddingService service = new EmbeddingService(builder.build());
        ReflectionTestUtils.setField(service, "apiKey", "test-key");
        ReflectionTestUtils.setField(service, "apiUrl", "https://api.mistral.ai/v1");

        server.expect(requestTo("https://api.mistral.ai/v1/embeddings"))
                .andExpect(method(POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andRespond(withSuccess("""
                        {
                          "data": [
                            { "index": 1, "embedding": [0.4, 0.5, 0.6] },
                            { "index": 0, "embedding": [0.1, 0.2, 0.3] }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        List<float[]> embeddings = service.embedBatch(List.of("first", "second"));

        assertThat(embeddings).hasSize(2);
        assertThat(embeddings.get(0)).containsExactly(0.1f, 0.2f, 0.3f);
        assertThat(embeddings.get(1)).containsExactly(0.4f, 0.5f, 0.6f);
        server.verify();
    }
}
