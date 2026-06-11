package com.nib.backend.eval;

import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.CitationDto;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class RagEvalScorer {

    private RagEvalScorer() {
    }

    public static RagEvalResult score(RagEvalCase evalCase, ChatQueryResponse response) {
        List<String> failures = new ArrayList<>();
        String answer = response.answer() == null ? "" : response.answer();
        String normalizedAnswer = answer.toLowerCase(Locale.ROOT);

        if (response.refused() != evalCase.expectsRefusal()) {
            failures.add("Expected refused=" + evalCase.expectsRefusal() + " but got " + response.refused());
        }

        for (String expected : evalCase.expectedAnswerContainsOrEmpty()) {
            if (!normalizedAnswer.contains(expected.toLowerCase(Locale.ROOT))) {
                failures.add("Answer did not contain expected text: " + expected);
            }
        }

        for (String forbidden : evalCase.expectedForbiddenContainsOrEmpty()) {
            if (normalizedAnswer.contains(forbidden.toLowerCase(Locale.ROOT))) {
                failures.add("Answer contained forbidden text: " + forbidden);
            }
        }

        if (evalCase.minConfidence() != null && response.confidence() < evalCase.minConfidence()) {
            failures.add("Expected confidence >= " + evalCase.minConfidence() + " but got " + response.confidence());
        }

        if (evalCase.maxConfidence() != null && response.confidence() > evalCase.maxConfidence()) {
            failures.add("Expected confidence <= " + evalCase.maxConfidence() + " but got " + response.confidence());
        }

        int citationCount = response.citations() == null ? 0 : response.citations().size();
        if (evalCase.minCitationCount() != null && citationCount < evalCase.minCitationCount()) {
            failures.add("Expected at least " + evalCase.minCitationCount() + " citation(s) but got " + citationCount);
        }

        if (evalCase.expectedPage() != null && !hasCitationPage(response, evalCase.expectedPage())) {
            failures.add("Expected at least one citation on page " + evalCase.expectedPage());
        }

        for (String sourceId : evalCase.requiredCitationSourceIdsOrEmpty()) {
            if (!hasCitationSourceId(response, sourceId)) {
                failures.add("Expected citation source id " + sourceId);
            }
        }

        if (evalCase.requiresGroundingVerified()) {
            if (response.groundingVerification() == null || !response.groundingVerification().verified()) {
                failures.add("Expected grounding verification to be verified");
            }
        }

        return new RagEvalResult(evalCase.id(), failures.isEmpty(), failures);
    }

    private static boolean hasCitationPage(ChatQueryResponse response, int pageNumber) {
        if (response.citations() == null) return false;
        return response.citations().stream().anyMatch(citation -> citation.pageNumber() == pageNumber);
    }

    private static boolean hasCitationSourceId(ChatQueryResponse response, String sourceId) {
        if (response.citations() == null) return false;
        return response.citations().stream()
                .map(CitationDto::sourceId)
                .anyMatch(actual -> sourceId.equalsIgnoreCase(actual));
    }
}
