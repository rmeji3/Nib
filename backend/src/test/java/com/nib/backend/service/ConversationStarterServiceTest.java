package com.nib.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.ChatStarterResponse;
import com.nib.backend.model.ContentBlock;
import com.nib.backend.model.Document;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ConversationStarterServiceTest {

    private final GeminiTextClient geminiTextClient = mock(GeminiTextClient.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConversationStarterService service =
            new ConversationStarterService(geminiTextClient, objectMapper);

    @Test
    void resolveStartersPrefersStoredMetadata() throws Exception {
        UUID documentId = UUID.randomUUID();
        Document document = Document.builder()
                .id(documentId)
                .docType("financial")
                .pageCount(12)
                .build();
        String metadata = service.toExtractionMetadata(List.of(
                new ChatStarterResponse("What drove revenue growth this quarter?", "search"),
                new ChatStarterResponse("Compare operating margin to the prior year.", "sparkles")
        ));
        List<ContentBlock> blocks = List.of(
                ContentBlock.builder()
                        .documentId(documentId)
                        .blockType("document_summary")
                        .extractedText("Quarterly earnings report with revenue up 18%.")
                        .extractionMetadata(metadata)
                        .build()
        );

        var starters = service.resolveStarters(document, blocks);

        assertThat(starters).hasSize(2);
        assertThat(starters.get(0).prompt()).containsIgnoringCase("revenue growth");
    }

    @Test
    void generateTailoredStartersParsesGeminiJson() {
        when(geminiTextClient.generate(anyString(), anyInt(), anyDouble())).thenReturn("""
                [
                  {"prompt":"What flow rate do they recommend for steady-state operation?", "icon":"search"},
                  {"prompt":"Which rack reaches the highest peak thermal load?", "icon":"sparkles"},
                  {"prompt":"How does Figure 3 relate throughput to coolant flow?", "icon":"search"},
                  {"prompt":"Summarize the commissioning window for Rack R6.", "icon":"sparkles"}
                ]
                """);

        var starters = service.generateTailoredStarters(
                """
                Liquid cooling study for AI racks.
                TYPE: Technical specification
                Peak load on Rack R6 is 62.4 kW; Figure 3 shows a knee at 2.4 L/min.
                """,
                "technical",
                6,
                "cooling-report.pdf",
                new ConversationStarterService.DocumentSignals(true, true, true)
        );

        assertThat(starters).hasSize(4);
        assertThat(starters).anySatisfy(starter ->
                assertThat(starter.prompt()).containsIgnoringCase("flow rate"));
        assertThat(starters).noneSatisfy(starter ->
                assertThat(starter.prompt()).containsIgnoringCase("most important details"));
    }

    @Test
    void buildTemplateStartersIncludesCatalogPrompts() {
        UUID documentId = UUID.randomUUID();
        Document document = Document.builder()
                .id(documentId)
                .docType("catalog")
                .pageCount(8)
                .build();

        var starters = service.buildTemplateStarters(document, List.of());

        assertThat(starters).anySatisfy(starter ->
                assertThat(starter.prompt()).containsIgnoringCase("product categories"));
    }
}
