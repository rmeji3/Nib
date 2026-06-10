package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeminiTextClientTest {

    @Test
    void generateWithMetadataReturnsTextAndTokenUsage() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiTextClient client = new GeminiTextClient(builder.build());
        ReflectionTestUtils.setField(client, "geminiApiKey", "gemini-key");
        ReflectionTestUtils.setField(client, "geminiApiUrl", "https://generativelanguage.googleapis.com/v1beta");
        ReflectionTestUtils.setField(client, "geminiModel", "gemini-2.5-flash");

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {
                          "candidates": [
                            {
                              "content": {
                                "parts": [
                                  { "text": "Revenue was $42.3M [B1]." }
                                ]
                              }
                            }
                          ],
                          "usageMetadata": {
                            "promptTokenCount": 101,
                            "candidatesTokenCount": 17,
                            "totalTokenCount": 118
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        GeminiTextClient.GenerationResult result = client.generateWithMetadata("prompt", 2048, 0.1);

        assertThat(result.text()).isEqualTo("Revenue was $42.3M [B1].");
        assertThat(result.tokenUsage().promptTokenCount()).isEqualTo(101);
        assertThat(result.tokenUsage().candidatesTokenCount()).isEqualTo(17);
        assertThat(result.tokenUsage().totalTokenCount()).isEqualTo(118);
        server.verify();
    }
}
