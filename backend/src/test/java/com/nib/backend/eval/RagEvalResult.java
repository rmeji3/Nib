package com.nib.backend.eval;

import java.util.List;

public record RagEvalResult(
        String caseId,
        boolean passed,
        List<String> failures
) {}
