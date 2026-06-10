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

class VisionServiceTest {

    @Test
    void analyzeRenderedImageReturnsGeminiVisionText() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        VisionService service = new VisionService(builder.build());
        ReflectionTestUtils.setField(service, "geminiApiKey", "gemini-key");
        ReflectionTestUtils.setField(service, "geminiApiUrl", "https://generativelanguage.googleapis.com/v1beta");
        ReflectionTestUtils.setField(service, "geminiModel", "gemini-2.5-flash");

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {
                          "candidates": [
                            {
                              "content": {
                                "parts": [
                                  { "text": "This page is titled: Revenue. The chart shows $42.3M." }
                                ]
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        String description = service.analyzeRenderedImage(new byte[]{1, 2, 3}, 1);

        assertThat(description).contains("Revenue").contains("$42.3M");
        server.verify();
    }
}
