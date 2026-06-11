package com.nib.backend.eval;

import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.CitationDto;
import com.nib.backend.dto.GroundingVerificationDto;

import java.util.List;
import java.util.Locale;

/**
 * Computes {@link RagEvalMetrics} for a single (case, response) pair. Pure and
 * deterministic — see {@link RagEvalMetrics} for metric semantics. Complements
 * {@link RagEvalScorer}, which produces hard pass/fail assertions; this class
 * produces the graded numbers that aggregate into {@link RagEvalReport}.
 */
public final class RagEvalMetricsCalculator {

    private RagEvalMetricsCalculator() {
    }

    public static RagEvalMetrics compute(RagEvalCase evalCase, ChatQueryResponse response) {
        boolean refused = response.refused();
        String answer = response.answer() == null ? "" : response.answer();
        String normalizedAnswer = answer.toLowerCase(Locale.ROOT);
        List<CitationDto> citations = response.citations() == null ? List.of() : response.citations();

        return new RagEvalMetrics(
                evalCase.id(),
                refused,
                faithfulness(response.groundingVerification(), refused),
                answerCorrectness(evalCase, normalizedAnswer, refused),
                contextPrecision(evalCase, citations, refused),
                contextRecall(evalCase, citations, refused),
                response.groundedness(),
                !refused
                        && response.groundingVerification() != null
                        && response.groundingVerification().verified(),
                hallucinated(evalCase, normalizedAnswer, refused)
        );
    }

    /** Cited checkable sentences / checkable sentences; 1.0 when nothing checkable. */
    private static Double faithfulness(GroundingVerificationDto verification, boolean refused) {
        if (refused || verification == null) return null;
        if (verification.checkedSentences() == 0) return 1.0;
        return (double) verification.citedSentences() / verification.checkedSentences();
    }

    /** Fraction of expected key phrases found in the answer. */
    private static Double answerCorrectness(RagEvalCase evalCase, String normalizedAnswer, boolean refused) {
        List<String> expected = evalCase.expectedAnswerContainsOrEmpty();
        if (refused || expected.isEmpty()) return null;
        long hits = expected.stream()
                .filter(phrase -> normalizedAnswer.contains(phrase.toLowerCase(Locale.ROOT)))
                .count();
        return (double) hits / expected.size();
    }

    /** Fraction of the answer's citations that point at the expected evidence. */
    private static Double contextPrecision(RagEvalCase evalCase, List<CitationDto> citations, boolean refused) {
        if (refused || !hasExpectedEvidence(evalCase)) return null;
        if (citations.isEmpty()) return 0.0;
        long relevant = citations.stream().filter(c -> citesExpectedEvidence(evalCase, c)).count();
        return (double) relevant / citations.size();
    }

    /** Fraction of expected evidence items surfaced by at least one citation. */
    private static Double contextRecall(RagEvalCase evalCase, List<CitationDto> citations, boolean refused) {
        if (refused || !hasExpectedEvidence(evalCase)) return null;
        int needed = 0;
        int found = 0;
        if (evalCase.expectedPage() != null) {
            needed++;
            if (citations.stream().anyMatch(c -> c.pageNumber() == evalCase.expectedPage())) {
                found++;
            }
        }
        for (String sourceId : evalCase.requiredCitationSourceIdsOrEmpty()) {
            needed++;
            if (citations.stream().anyMatch(c -> sourceId.equalsIgnoreCase(c.sourceId()))) {
                found++;
            }
        }
        return needed == 0 ? null : (double) found / needed;
    }

    /** A non-refused answer containing any forbidden phrase counts as a hallucination. */
    private static boolean hallucinated(RagEvalCase evalCase, String normalizedAnswer, boolean refused) {
        if (refused) return false;
        return evalCase.expectedForbiddenContainsOrEmpty().stream()
                .anyMatch(phrase -> normalizedAnswer.contains(phrase.toLowerCase(Locale.ROOT)));
    }

    private static boolean hasExpectedEvidence(RagEvalCase evalCase) {
        return evalCase.expectedPage() != null || !evalCase.requiredCitationSourceIdsOrEmpty().isEmpty();
    }

    private static boolean citesExpectedEvidence(RagEvalCase evalCase, CitationDto citation) {
        if (evalCase.expectedPage() != null && citation.pageNumber() == evalCase.expectedPage()) {
            return true;
        }
        return evalCase.requiredCitationSourceIdsOrEmpty().stream()
                .anyMatch(sourceId -> sourceId.equalsIgnoreCase(citation.sourceId()));
    }
}
