package com.nib.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CitationVerifierTest {

    private final GeminiTextClient geminiTextClient = mock(GeminiTextClient.class);
    private final CitationVerifier verifier = new CitationVerifier(geminiTextClient, new ObjectMapper());

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(verifier, "enabled", true);
        ReflectionTestUtils.setField(verifier, "failClosed", true);
        ReflectionTestUtils.setField(verifier, "maxSourceChars", 1200);
    }

    @Test
    void passesRefusalWithoutCallingVerifierModel() {
        CitationVerifier.VerificationResult result = verifier.verify(
                "Who is the CFO?",
                "I cannot find this information in the indexed pages of this document.",
                List.of(chunk("The document only discusses product names."))
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        assertThat(result.answer()).contains("cannot find this information");
        verifyNoInteractions(geminiTextClient);
    }

    @Test
    void rewritesAnswerWhenClaimsNeedSupportedCitations() {
        VectorSearchService.ChunkMatch source = chunk(
                "Fiscal year 2026 revenue was $12M. Gross margin was 42%."
        );
        when(geminiTextClient.generate(anyString(), eq(1200), eq(0.0))).thenReturn("""
                {
                  "verdict": "REWRITE",
                  "issues": [
                    {"claim": "Gross margin was 42%.", "reason": "missing-citation"}
                  ],
                  "rewrittenAnswer": "Fiscal year 2026 revenue was $12M [B1]. Gross margin was 42% [B1]."
                }
                """);

        CitationVerifier.VerificationResult result = verifier.verify(
                "What were revenue and gross margin?",
                "Fiscal year 2026 revenue was $12M [B1]. Gross margin was 42%.",
                List.of(source)
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        assertThat(result.answer()).isEqualTo(
                "Fiscal year 2026 revenue was $12M [B1]. Gross margin was 42% [B1].");
        assertThat(result.issues()).extracting(CitationVerifier.Issue::reason)
                .contains("missing-citation");
    }

    @Test
    void refusesWhenVerifierFindsUnsupportedCitation() {
        VectorSearchService.ChunkMatch source = chunk(
                "Fiscal year 2026 revenue was $12M."
        );
        when(geminiTextClient.generate(anyString(), eq(1200), eq(0.0))).thenReturn("""
                {
                  "verdict": "REFUSE",
                  "issues": [
                    {"claim": "Fiscal year 2026 revenue was $99M [B1].", "reason": "contradicted"}
                  ],
                  "rewrittenAnswer": ""
                }
                """);

        CitationVerifier.VerificationResult result = verifier.verify(
                "What was revenue?",
                "Fiscal year 2026 revenue was $99M [B1].",
                List.of(source)
        );

        assertThat(result.verified()).isFalse();
        assertThat(result.refused()).isTrue();
        assertThat(result.answer()).contains("cannot verify this answer");
        assertThat(result.issues()).extracting(CitationVerifier.Issue::reason)
                .contains("contradicted");
    }

    @Test
    void failsClosedWhenVerifierModelErrors() {
        when(geminiTextClient.generate(anyString(), eq(1200), eq(0.0)))
                .thenThrow(new RuntimeException("quota exhausted"));

        CitationVerifier.VerificationResult result = verifier.verify(
                "What was revenue?",
                "Fiscal year 2026 revenue was $12M [B1].",
                List.of(chunk("Fiscal year 2026 revenue was $12M."))
        );

        assertThat(result.verified()).isFalse();
        assertThat(result.refused()).isTrue();
        assertThat(result.issues()).extracting(CitationVerifier.Issue::reason)
                .contains("verifier-failed");
    }

    private static VectorSearchService.ChunkMatch chunk(String text) {
        return new VectorSearchService.ChunkMatch(
                UUID.randomUUID(),
                UUID.randomUUID(),
                1,
                0,
                text,
                "text",
                0.1,
                null,
                null,
                null
        );
    }
}
