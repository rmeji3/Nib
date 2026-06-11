package com.nib.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
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
    void treatsEndOfLineCitationAsCoveringResumeBulletFragments() {
        when(geminiTextClient.generate(anyString(), eq(1200), eq(0.0))).thenReturn("""
                {
                  "verdict": "PASS",
                  "issues": [],
                  "rewrittenAnswer": ""
                }
                """);

        CitationVerifier.VerificationResult result = verifier.verify(
                "What experience is listed?",
                """
                - Software Engineer Intern at Microsoft – Azure Kubernetes Service from May 2025 to Aug. 2025 [B1].
                - Teaching Assistant – Data Structures & Algorithms at University of Illinois Chicago from Aug. 2023 to Dec. 2023 [B1].
                """,
                List.of(chunk("""
                        Software Engineer Intern at Microsoft – Azure Kubernetes Service from May 2025 to Aug. 2025.
                        Teaching Assistant – Data Structures & Algorithms at University of Illinois Chicago from Aug. 2023 to Dec. 2023.
                        """))
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        assertThat(result.issues()).isEmpty();
    }

    @Test
    void ignoresUncitedStructuralLeadInsBeforeCitedLists() {
        when(geminiTextClient.generate(anyString(), eq(1200), eq(0.0))).thenReturn("""
                {
                  "verdict": "PASS",
                  "issues": [],
                  "rewrittenAnswer": ""
                }
                """);

        CitationVerifier.VerificationResult result = verifier.verify(
                "What is on page 1?",
                """
                Page 1 contains the following sections:
                - Experience: Software Engineer Intern at Microsoft on Azure Kubernetes Service [B1].
                - Education: University of Illinois Chicago [B1].
                """,
                List.of(chunk("""
                        Experience: Software Engineer Intern at Microsoft on Azure Kubernetes Service.
                        Education: University of Illinois Chicago.
                        """))
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        assertThat(result.issues()).isEmpty();
    }

    @Test
    void evaluativeQuestionsAllowJudgmentsGroundedInCitedFacts() {
        CitationVerifier.VerificationResult result = verifier.verify(
                "What are the weak points of this resume?",
                "A potential weak point is that the project impact could be clearer because the retrieved resume evidence lists internship work but no quantified outcomes [B1].",
                List.of(chunk("Software Engineer Intern at Microsoft. Projects: Kubernetes autoscaling and monitoring."))
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        verifyNoInteractions(geminiTextClient);
    }

    @Test
    void evaluativeAnswersWithMissingCitationTagsAreRepairedBeforeVerification() {
        CitationVerifier.VerificationResult result = verifier.verify(
                "What are the weak points of this resume?",
                """
                This resume has strong experience, but a few points could read more clearly to recruiters.
                - I would want to see more quantified impact for the freelance CMS work, because the current evidence says it is used by multiple clients but does not show scale or results.
                - The Ping App could use a clearer product explanation, because the retrieved evidence lists the tech stack but not the user problem or outcome.
                """,
                List.of(chunk("""
                        Freelance Web Developer: built a custom CMS now used by multiple clients.
                        Ping App: React, Node.js, PostgreSQL, AWS.
                        """))
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        assertThat(result.answer()).contains("[B1]");
        assertThat(result.answer()).contains("multiple clients but does not show scale or results. [B1]");
        verifyNoInteractions(geminiTextClient);
    }

    @Test
    void evaluativeAnswersNormalizeCombinedBlockCitationsBeforePreflight() {
        CitationVerifier.VerificationResult result = verifier.verify(
                "What are the weak points of this resume?",
                "The Microsoft internship and project bullets are useful, but the impact story would be clearer with outcomes [B1, B2].",
                List.of(
                        chunk("Software Engineer Intern at Microsoft on Azure Kubernetes Service."),
                        chunk("Ping App: React, Node.js, PostgreSQL, AWS.")
                )
        );

        assertThat(result.verified()).isTrue();
        assertThat(result.refused()).isFalse();
        assertThat(result.answer()).contains("[B1][B2]");
        assertThat(result.answer()).doesNotContain("[B1, B2]");
        verifyNoInteractions(geminiTextClient);
    }

    @Test
    void nonEvaluativeQuestionsKeepLiteralSupportRule() {
        when(geminiTextClient.generate(anyString(), eq(1200), eq(0.0))).thenReturn("""
                {
                  "verdict": "PASS",
                  "issues": [],
                  "rewrittenAnswer": ""
                }
                """);

        verifier.verify(
                "What was revenue?",
                "Fiscal year 2026 revenue was $12M [B1].",
                List.of(chunk("Fiscal year 2026 revenue was $12M."))
        );

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(geminiTextClient).generate(promptCaptor.capture(), eq(1200), eq(0.0));
        assertThat(promptCaptor.getValue()).doesNotContain("This is an evaluative question");
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
