package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RerankerServiceTest {

    private static final String API_URL = "https://api.cohere.com/v2/rerank";

    private static VectorSearchService.ChunkMatch chunk(String text, int page) {
        return new VectorSearchService.ChunkMatch(
                UUID.randomUUID(), UUID.randomUUID(), page, 0, text, "text", 0.2, null, null, null);
    }

    private static RerankerService buildService(RestClient restClient, String apiKey) {
        RerankerService service = new RerankerService(restClient);
        ReflectionTestUtils.setField(service, "apiKey", apiKey);
        ReflectionTestUtils.setField(service, "apiUrl", API_URL);
        ReflectionTestUtils.setField(service, "model", "rerank-v3.5");
        ReflectionTestUtils.setField(service, "candidatePoolSize", 40);
        ReflectionTestUtils.setField(service, "maxChunkChars", 2000);
        return service;
    }

    @Test
    void rerankIsDisabledWithoutApiKeyAndMakesNoHttpCall() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RerankerService service = buildService(builder.build(), "");

        assertThat(service.isEnabled()).isFalse();
        assertThat(service.rerank("What was revenue?", List.of(chunk("Revenue was $42.3M.", 1)), 5))
                .isEmpty();
        server.verify();
    }

    @Test
    void rerankOrdersChunksByRelevanceKeepsTopKAndSkipsInvalidIndexes() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RerankerService service = buildService(builder.build(), "rerank-key");

        server.expect(requestTo(API_URL))
                .andExpect(method(POST))
                .andExpect(header("Authorization", "Bearer rerank-key"))
                .andRespond(withSuccess("""
                        {
                          "results": [
                            { "index": 1, "relevance_score": 0.91 },
                            { "index": 0, "relevance_score": 0.18 },
                            { "index": 7, "relevance_score": 0.99 }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        VectorSearchService.ChunkMatch prose = chunk("The company was founded in 2001.", 1);
        VectorSearchService.ChunkMatch revenue = chunk("Revenue was $42.3M in Q1.", 2);

        var result = service.rerank("What was revenue?", List.of(prose, revenue), 1);

        assertThat(result).isPresent();
        assertThat(result.get().chunkMatches()).containsExactly(revenue);
        assertThat(result.get().topRelevance()).isCloseTo(0.91, within(1e-9));
        server.verify();
    }

    @Test
    void rerankFailsOpenOnProviderError() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RerankerService service = buildService(builder.build(), "rerank-key");

        server.expect(requestTo(API_URL))
                .andExpect(method(POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"internal error\"}"));

        var result = service.rerank("What was revenue?", List.of(chunk("Revenue was $42.3M.", 1)), 5);

        assertThat(result).isEmpty();
        server.verify();
    }

    @Test
    void rerankFailsOpenWhenResponseHasNoUsableResults() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RerankerService service = buildService(builder.build(), "rerank-key");

        server.expect(requestTo(API_URL))
                .andExpect(method(POST))
                .andRespond(withSuccess("{\"results\":[]}", MediaType.APPLICATION_JSON));

        var result = service.rerank("What was revenue?", List.of(chunk("Revenue was $42.3M.", 1)), 5);

        assertThat(result).isEmpty();
        server.verify();
    }
}
