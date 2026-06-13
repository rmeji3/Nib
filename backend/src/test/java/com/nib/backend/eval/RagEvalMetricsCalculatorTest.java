package com.nib.backend.eval;

import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.CitationDto;
import com.nib.backend.dto.GroundingVerificationDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class RagEvalMetricsCalculatorTest {

    private static RagEvalCase evalCase(
            List<String> expectedContains,
            List<String> forbidden,
            Integer expectedPage,
            List<String> requiredSourceIds
    ) {
        return new RagEvalCase(
                "case-1", "fixture.pdf", "chart", "What was revenue?",
                expectedContains, forbidden, expectedPage, false,
                null, null, null, requiredSourceIds, true
        );
    }

    private static CitationDto citation(int page, String sourceId) {
        return new CitationDto(
                page, sourceId, UUID.randomUUID(), UUID.randomUUID(), "text", 0,
                "text", "excerpt", null, null, null
        );
    }

    private static ChatQueryResponse response(
            String answer,
            List<CitationDto> citations,
            double groundedness,
            GroundingVerificationDto verification,
            boolean refused
    ) {
        return new ChatQueryResponse(
                UUID.randomUUID(), UUID.randomUUID(), answer, citations,
                "gemini-2.5-flash", "2026-06-10T10:00:00", 0.9, groundedness,
                verification, refused
        );
    }

    private static GroundingVerificationDto verification(boolean verified, int checked, int cited) {
        return new GroundingVerificationDto(
                verified, verified ? "VERIFIED" : "PARTIAL",
                checked == 0 ? 1.0 : (double) cited / checked,
                checked, cited, List.of(), List.of(), List.of()
        );
    }

    @Test
    void computesAllMetricsForAGroundedAnswer() {
        RagEvalCase evalCase = evalCase(
                List.of("$42.3M", "Q4"), List.of("$99"), 2, List.of("B1"));
        ChatQueryResponse response = response(
                "Revenue was $42.3M in Q4 [B1].",
                List.of(citation(2, "B1"), citation(5, "B3")),
                1.0,
                verification(true, 2, 2),
                false
        );

        RagEvalMetrics metrics = RagEvalMetricsCalculator.compute(evalCase, response);

        assertThat(metrics.refused()).isFalse();
        assertThat(metrics.faithfulness()).isEqualTo(1.0);
        assertThat(metrics.answerCorrectness()).isEqualTo(1.0);
        // One of two citations hits the expected page-2/B1 evidence.
        assertThat(metrics.contextPrecision()).isEqualTo(0.5);
        // Both expected evidence items (page 2 and B1) were surfaced.
        assertThat(metrics.contextRecall()).isEqualTo(1.0);
        assertThat(metrics.groundingVerified()).isTrue();
        assertThat(metrics.hallucinated()).isFalse();
    }

    @Test
    void flagsHallucinationAndPartialCorrectness() {
        RagEvalCase evalCase = evalCase(
                List.of("$42.3M", "Q4"), List.of("$99"), null, List.of());
        ChatQueryResponse response = response(
                "Revenue was $99 in Q4.",
                List.of(),
                0.0,
                verification(false, 1, 0),
                false
        );

        RagEvalMetrics metrics = RagEvalMetricsCalculator.compute(evalCase, response);

        assertThat(metrics.hallucinated()).isTrue();
        assertThat(metrics.faithfulness()).isEqualTo(0.0);
        // Only "Q4" of the two expected phrases is present.
        assertThat(metrics.answerCorrectness()).isCloseTo(0.5, within(1e-9));
        // No expected evidence configured → precision/recall not applicable.
        assertThat(metrics.contextPrecision()).isNull();
        assertThat(metrics.contextRecall()).isNull();
        assertThat(metrics.groundingVerified()).isFalse();
    }

    @Test
    void refusalsSkipGradedMetrics() {
        RagEvalCase evalCase = evalCase(List.of("$42.3M"), List.of(), 2, List.of("B1"));
        ChatQueryResponse response = response(
                "I cannot find enough relevant information.",
                List.of(), 0.0, null, true);

        RagEvalMetrics metrics = RagEvalMetricsCalculator.compute(evalCase, response);

        assertThat(metrics.refused()).isTrue();
        assertThat(metrics.faithfulness()).isNull();
        assertThat(metrics.answerCorrectness()).isNull();
        assertThat(metrics.contextPrecision()).isNull();
        assertThat(metrics.contextRecall()).isNull();
        assertThat(metrics.hallucinated()).isFalse();
    }

    @Test
    void reportAggregatesRatesOverNonRefusedAnswers() {
        RagEvalMetrics grounded = new RagEvalMetrics(
                "a", false, 1.0, 1.0, 1.0, 1.0, 1.0, true, false);
        RagEvalMetrics hallucinating = new RagEvalMetrics(
                "b", false, 0.5, 0.0, 0.0, 0.5, 0.5, false, true);
        RagEvalMetrics refusal = new RagEvalMetrics(
                "c", true, null, null, null, null, 0.0, false, false);

        RagEvalReport report = RagEvalReport.from(List.of(grounded, hallucinating, refusal));

        assertThat(report.totalCases()).isEqualTo(3);
        assertThat(report.refusedCases()).isEqualTo(1);
        // Rates are over the two answered cases.
        assertThat(report.groundednessRate()).isCloseTo(0.5, within(1e-9));
        assertThat(report.hallucinationRate()).isCloseTo(0.5, within(1e-9));
        assertThat(report.meanFaithfulness()).isCloseTo(0.75, within(1e-9));
        assertThat(report.meanAnswerCorrectness()).isCloseTo(0.5, within(1e-9));

        String markdown = report.toMarkdown();
        assertThat(markdown).contains("Groundedness rate | 50.0% | >= 95%");
        assertThat(markdown).contains("Hallucination rate | 50.0% | <= 5%");
        assertThat(markdown).contains("Faithfulness (mean) | 75.0%");
    }
}
