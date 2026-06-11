package com.nib.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisionServiceTest {

    private final ChatModel chatModel = mock(ChatModel.class);
    private final VisionService service = new VisionService(chatModel, new ObjectMapper());

    private static ChatResponse response(String text) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(text))));
    }

    @Test
    void analyzeRenderedImageSendsPngMediaAndReturnsGeminiVisionText() {
        ReflectionTestUtils.setField(service, "geminiModel", "gemini-2.5-flash");
        when(chatModel.call(any(Prompt.class)))
                .thenReturn(response("This page is titled: Revenue. The chart shows $42.3M."));

        String description = service.analyzeRenderedImage(new byte[]{1, 2, 3}, 1);

        assertThat(description).contains("Revenue").contains("$42.3M");

        ArgumentCaptor<Prompt> promptCaptor = ArgumentCaptor.forClass(Prompt.class);
        verify(chatModel).call(promptCaptor.capture());
        Prompt prompt = promptCaptor.getValue();
        assertThat(prompt.getOptions().getModel()).isEqualTo("gemini-2.5-flash");
        UserMessage message = (UserMessage) prompt.getInstructions().get(0);
        assertThat(message.getMedia()).hasSize(1);
        assertThat(message.getText()).contains("Analyze this PDF page");
    }

    @Test
    void analyzeRenderedImageStructuredReturnsTablesAndCharts() {
        ReflectionTestUtils.setField(service, "geminiModel", "gemini-2.5-flash");
        when(chatModel.call(any(Prompt.class))).thenReturn(response("""
                {"pageSummary":"Revenue page","elements":[{"type":"chart","title":"Revenue",\
                "summary":"Revenue rose","bbox":{"x":0.1,"y":0.2,"width":0.7,"height":0.5},\
                "tableStructure":null,"chartSummary":"Q4 is highest",\
                "axisLabels":{"x":"Quarter","y":"Revenue"},"units":{"y":"USD millions"},\
                "dataPoints":[{"label":"Q4","y":"42.3"}],"caption":null,"confidence":0.92}]}"""));

        VisionService.VisualExtractionResult result = service.analyzeRenderedImageStructured(new byte[]{1, 2, 3}, 1);

        assertThat(result.pageSummary()).isEqualTo("Revenue page");
        assertThat(result.elements()).hasSize(1);
        assertThat(result.elements().get(0).type()).isEqualTo("chart");
        assertThat(result.elements().get(0).chartSummary()).contains("Q4");
        assertThat(result.elements().get(0).axisLabels().get("y").asText()).isEqualTo("Revenue");
        assertThat(result.elements().get(0).dataPoints().get(0).get("y").asText()).isEqualTo("42.3");
    }

    @Test
    void analyzeRenderedImageReturnsNullWhenProviderFails() {
        ReflectionTestUtils.setField(service, "geminiModel", "gemini-2.5-flash");
        when(chatModel.call(any(Prompt.class))).thenThrow(new RuntimeException("503 Service Unavailable"));

        assertThat(service.analyzeRenderedImage(new byte[]{1, 2, 3}, 1)).isNull();
    }
}
