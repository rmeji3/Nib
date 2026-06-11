package com.nib.backend.eval;

import java.util.List;
import java.util.Locale;

/**
 * Aggregate quality report over a set of {@link RagEvalMetrics}. Produces the
 * industry-comparable numbers behind the README success metrics:
 * "answer groundedness rate >= 95%" maps to {@link #groundednessRate} and
 * "hallucination rate <= 5%" maps to {@link #hallucinationRate}.
 *
 * Mean metrics skip cases where a metric is not applicable (null). Rates are
 * computed over non-refused answers only — a correct refusal is neither
 * grounded nor hallucinated.
 */
public record RagEvalReport(
        int totalCases,
        int refusedCases,
        Double meanFaithfulness,
        Double meanAnswerCorrectness,
        Double meanContextPrecision,
        Double meanContextRecall,
        Double meanGroundedness,
        Double groundednessRate,
        Double hallucinationRate
) {

    public static RagEvalReport from(List<RagEvalMetrics> metrics) {
        int total = metrics.size();
        int refused = (int) metrics.stream().filter(RagEvalMetrics::refused).count();
        List<RagEvalMetrics> answered = metrics.stream().filter(m -> !m.refused()).toList();

        return new RagEvalReport(
                total,
                refused,
                mean(metrics.stream().map(RagEvalMetrics::faithfulness).toList()),
                mean(metrics.stream().map(RagEvalMetrics::answerCorrectness).toList()),
                mean(metrics.stream().map(RagEvalMetrics::contextPrecision).toList()),
                mean(metrics.stream().map(RagEvalMetrics::contextRecall).toList()),
                mean(metrics.stream().map(m -> (Double) m.groundedness()).toList()),
                rate(answered, answered.stream().filter(RagEvalMetrics::groundingVerified).count()),
                rate(answered, answered.stream().filter(RagEvalMetrics::hallucinated).count())
        );
    }

    public String toMarkdown() {
        StringBuilder sb = new StringBuilder();
        sb.append("# RAG Eval Report\n\n");
        sb.append("| Metric | Value | Target |\n");
        sb.append("| --- | --- | --- |\n");
        sb.append(row("Cases (refused)", totalCases + " (" + refusedCases + ")", "—"));
        sb.append(row("Groundedness rate", percent(groundednessRate), ">= 95%"));
        sb.append(row("Hallucination rate", percent(hallucinationRate), "<= 5%"));
        sb.append(row("Faithfulness (mean)", percent(meanFaithfulness), "—"));
        sb.append(row("Answer correctness (mean)", percent(meanAnswerCorrectness), "—"));
        sb.append(row("Context precision (mean)", percent(meanContextPrecision), "—"));
        sb.append(row("Context recall (mean)", percent(meanContextRecall), "—"));
        sb.append(row("Sentence citation coverage (mean)", percent(meanGroundedness), "—"));
        return sb.toString();
    }

    private static String row(String metric, String value, String target) {
        return "| " + metric + " | " + value + " | " + target + " |\n";
    }

    private static String percent(Double value) {
        return value == null ? "n/a" : String.format(Locale.ROOT, "%.1f%%", value * 100.0);
    }

    private static Double mean(List<Double> values) {
        List<Double> present = values.stream().filter(java.util.Objects::nonNull).toList();
        if (present.isEmpty()) return null;
        return present.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private static Double rate(List<RagEvalMetrics> denominator, long numerator) {
        if (denominator.isEmpty()) return null;
        return (double) numerator / denominator.size();
    }
}
