package com.nib.backend.eval;

/**
 * Ragas-style quality metrics for one eval case, computed deterministically
 * from the chat response and the case's machine-checkable expectations — no
 * LLM judge, so values are stable across runs and safe for CI gates.
 *
 * Metric semantics (all in [0,1], {@code null} = not applicable for this case):
 * <ul>
 *   <li><b>faithfulness</b> — fraction of checkable answer sentences backed by a
 *       valid citation (from deterministic grounding verification). Ragas
 *       "faithfulness" approximated via citation support instead of an LLM judge.</li>
 *   <li><b>answerCorrectness</b> — fraction of expected key phrases present in
 *       the answer (lexical recall flavor of Ragas "answer correctness").</li>
 *   <li><b>contextPrecision</b> — fraction of the answer's citations that point
 *       at the expected evidence (page / source ids).</li>
 *   <li><b>contextRecall</b> — fraction of the expected evidence items that were
 *       actually surfaced by at least one citation.</li>
 * </ul>
 */
public record RagEvalMetrics(
        String caseId,
        boolean refused,
        Double faithfulness,
        Double answerCorrectness,
        Double contextPrecision,
        Double contextRecall,
        double groundedness,
        boolean groundingVerified,
        boolean hallucinated
) {}
