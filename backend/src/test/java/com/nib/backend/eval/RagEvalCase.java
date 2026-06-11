package com.nib.backend.eval;

import java.util.List;

/**
 * Machine-checkable expectations for one document-QA regression case.
 * The PDF is a fixture path relative to {@code src/test/resources/eval}.
 */
public record RagEvalCase(
        String id,
        String pdf,
        String category,
        String question,
        List<String> expectedAnswerContains,
        List<String> expectedForbiddenContains,
        Integer expectedPage,
        Boolean shouldRefuse,
        Double minConfidence,
        Double maxConfidence,
        Integer minCitationCount,
        List<String> requiredCitationSourceIds,
        Boolean requireGroundingVerified
) {
    public List<String> expectedAnswerContainsOrEmpty() {
        return expectedAnswerContains == null ? List.of() : expectedAnswerContains;
    }

    public List<String> expectedForbiddenContainsOrEmpty() {
        return expectedForbiddenContains == null ? List.of() : expectedForbiddenContains;
    }

    public List<String> requiredCitationSourceIdsOrEmpty() {
        return requiredCitationSourceIds == null ? List.of() : requiredCitationSourceIds;
    }

    public boolean expectsRefusal() {
        return Boolean.TRUE.equals(shouldRefuse);
    }

    public boolean requiresGroundingVerified() {
        return Boolean.TRUE.equals(requireGroundingVerified);
    }
}
