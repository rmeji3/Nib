package com.nib.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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
        VisionService service = new VisionService(builder.build(), new ObjectMapper());
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

    @Test
    void analyzeRenderedImageStructuredReturnsTablesAndCharts() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        VisionService service = new VisionService(builder.build(), new ObjectMapper());
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
                                  { "text": "{\\"pageSummary\\":\\"Revenue page\\",\\"elements\\":[{\\"type\\":\\"chart\\",\\"title\\":\\"Revenue\\",\\"summary\\":\\"Revenue rose\\",\\"bbox\\":{\\"x\\":0.1,\\"y\\":0.2,\\"width\\":0.7,\\"height\\":0.5},\\"tableStructure\\":null,\\"chartSummary\\":\\"Q4 is highest\\",\\"axisLabels\\":{\\"x\\":\\"Quarter\\",\\"y\\":\\"Revenue\\"},\\"units\\":{\\"y\\":\\"USD millions\\"},\\"dataPoints\\":[{\\"label\\":\\"Q4\\",\\"y\\":\\"42.3\\"}],\\"caption\\":null,\\"confidence\\":0.92}]}" }
                                ]
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        VisionService.VisualExtractionResult result = service.analyzeRenderedImageStructured(new byte[]{1, 2, 3}, 1);

        assertThat(result.pageSummary()).isEqualTo("Revenue page");
        assertThat(result.elements()).hasSize(1);
        assertThat(result.elements().get(0).type()).isEqualTo("chart");
        assertThat(result.elements().get(0).chartSummary()).contains("Q4");
        assertThat(result.elements().get(0).axisLabels().get("y").asText()).isEqualTo("Revenue");
        assertThat(result.elements().get(0).dataPoints().get(0).get("y").asText()).isEqualTo("42.3");
        server.verify();
    }
}
