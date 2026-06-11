package com.nib.backend.service;

import com.nib.backend.dto.GroundingVerificationDto;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * LLM-pipeline tracing for chat queries. Emits one trace per question with a
 * child span per RAG stage (rewrite → retrieval → rerank → generation →
 * verification) so a bad answer can be debugged end-to-end in one view.
 *
 * Spans go through Micrometer Tracing to the OpenTelemetry OTLP exporter; the
 * endpoint/auth in application.properties target Langfuse by default but any
 * OTel backend works. Attributes follow the GenAI + Langfuse conventions
 * (gen_ai.*, langfuse.observation.*) so Langfuse renders prompt/completion
 * panes natively.
 *
 * Fail-safe by design: when {@code rag-tracing.enabled} is false (default) or
 * no Tracer bean exists, every method is a cheap no-op; tracing errors are
 * logged and swallowed so they can never break chat. Note: if an unexpected
 * exception escapes the chat flow before a terminal {@code end*} call, the
 * root span is simply never exported.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagChatTracer {

    private final ObjectProvider<Tracer> tracerProvider;

    @Value("${rag-tracing.enabled:false}")
    private boolean enabled;

    /** Include prompts/answers/chunk excerpts in spans (they contain document text). */
    @Value("${rag-tracing.include-payloads:true}")
    private boolean includePayloads;

    @Value("${rag-tracing.max-payload-chars:8000}")
    private int maxPayloadChars;

    public ChatTrace startTrace(UUID sessionId, UUID documentId, UUID userId, String question) {
        if (!enabled) {
            return ChatTrace.NOOP;
        }
        Tracer tracer = tracerProvider.getIfAvailable();
        if (tracer == null) {
            return ChatTrace.NOOP;
        }
        try {
            Span root = tracer.nextSpan()
                    .name("rag.chat.query")
                    .tag("rag.session.id", String.valueOf(sessionId))
                    .tag("rag.document.id", String.valueOf(documentId))
                    .tag("rag.user.id", String.valueOf(userId))
                    .tag("langfuse.observation.input", payload(question))
                    .start();
            return new ChatTrace(tracer, root, this);
        } catch (RuntimeException ex) {
            log.warn("Failed to start chat trace: {}", ex.getMessage());
            return ChatTrace.NOOP;
        }
    }

    private String payload(String value) {
        if (!includePayloads) return "[payloads disabled]";
        if (value == null) return "";
        return value.length() > maxPayloadChars ? value.substring(0, maxPayloadChars) + "…[truncated]" : value;
    }

    /**
     * One in-flight chat trace. All record methods create a child span under the
     * root query span; {@code end()} closes the root. Every method is a no-op on
     * the {@link #NOOP} instance and swallows tracing failures otherwise.
     */
    public static final class ChatTrace {

        static final ChatTrace NOOP = new ChatTrace(null, null, null);

        private final Tracer tracer;
        private final Span root;
        private final RagChatTracer owner;

        private ChatTrace(Tracer tracer, Span root, RagChatTracer owner) {
            this.tracer = tracer;
            this.root = root;
            this.owner = owner;
        }

        public void recordRewrite(String originalQuestion, String rewrittenQuery) {
            stage("rag.query.rewrite", span -> span
                    .tag("langfuse.observation.input", owner.payload(originalQuestion))
                    .tag("langfuse.observation.output", owner.payload(rewrittenQuery))
                    .tag("rag.rewrite.changed", String.valueOf(!originalQuestion.equals(rewrittenQuery))));
        }

        public void recordRetrieval(
                int requestedCandidates,
                List<VectorSearchService.ChunkMatch> chunks,
                double retrievalConfidence,
                boolean usedStoredBlockFallback
        ) {
            stage("rag.retrieval", span -> span
                    .tag("rag.retrieval.requested_candidates", String.valueOf(requestedCandidates))
                    .tag("rag.retrieval.chunk_count", String.valueOf(chunks.size()))
                    .tag("rag.retrieval.confidence", format(retrievalConfidence))
                    .tag("rag.retrieval.stored_block_fallback", String.valueOf(usedStoredBlockFallback))
                    .tag("langfuse.observation.output", owner.payload(describeChunks(chunks))));
        }

        public void recordRerank(boolean crossEncoderUsed, Double topRelevance, int keptChunks) {
            stage("rag.rerank", span -> {
                span.tag("rag.rerank.strategy", crossEncoderUsed ? "cross-encoder" : "heuristic")
                        .tag("rag.rerank.kept_chunks", String.valueOf(keptChunks));
                if (topRelevance != null) {
                    span.tag("rag.rerank.top_relevance", format(topRelevance));
                }
            });
        }

        public void recordGeneration(
                String prompt,
                String rawAnswer,
                String modelVersion,
                GeminiTextClient.TokenUsage tokenUsage
        ) {
            stage("rag.generation", span -> {
                span.tag("langfuse.observation.type", "generation")
                        .tag("gen_ai.request.model", String.valueOf(modelVersion))
                        .tag("langfuse.observation.input", owner.payload(prompt))
                        .tag("langfuse.observation.output", owner.payload(rawAnswer));
                if (tokenUsage != null && tokenUsage.promptTokenCount() != null) {
                    span.tag("gen_ai.usage.input_tokens", String.valueOf(tokenUsage.promptTokenCount()));
                }
                if (tokenUsage != null && tokenUsage.candidatesTokenCount() != null) {
                    span.tag("gen_ai.usage.output_tokens", String.valueOf(tokenUsage.candidatesTokenCount()));
                }
            });
        }

        public void recordVerification(
                boolean verifierPassed,
                boolean verifierRefused,
                List<?> issues,
                GroundingVerificationDto grounding
        ) {
            stage("rag.verification", span -> {
                span.tag("rag.verifier.passed", String.valueOf(verifierPassed))
                        .tag("rag.verifier.refused", String.valueOf(verifierRefused))
                        .tag("rag.verifier.issue_count", String.valueOf(issues == null ? 0 : issues.size()));
                if (issues != null && !issues.isEmpty()) {
                    String joined = issues.stream()
                            .map(String::valueOf)
                            .collect(Collectors.joining(" | "));
                    span.tag("rag.verifier.issues", owner.payload(joined));
                }
                if (grounding != null) {
                    span.tag("rag.grounding.verdict", String.valueOf(grounding.verdict()))
                            .tag("rag.grounding.score", format(grounding.score()));
                }
            });
        }

        /**
         * Terminal call — tags the root span with the outcome and closes it.
         * outcome is one of: answered, verifier_refused, cache_hit,
         * refused_low_confidence, clarification, model_unavailable.
         */
        public void end(String outcome, double confidence, double groundedness, String finalAnswer) {
            if (root == null) return;
            try {
                root.tag("rag.outcome", outcome)
                        .tag("rag.confidence", format(confidence))
                        .tag("rag.groundedness", format(groundedness))
                        .tag("langfuse.observation.output", owner.payload(finalAnswer));
            } catch (RuntimeException ex) {
                log.warn("Failed to tag chat trace: {}", ex.getMessage());
            } finally {
                safeEnd(root);
            }
        }

        private void stage(String name, java.util.function.Consumer<Span> tagger) {
            if (root == null) return;
            try (Tracer.SpanInScope ignored = tracer.withSpan(root)) {
                Span span = tracer.nextSpan().name(name).start();
                try {
                    tagger.accept(span);
                } finally {
                    safeEnd(span);
                }
            } catch (RuntimeException ex) {
                log.warn("Failed to record {} span: {}", name, ex.getMessage());
            }
        }

        private static void safeEnd(Span span) {
            try {
                span.end();
            } catch (RuntimeException ex) {
                log.warn("Failed to end span: {}", ex.getMessage());
            }
        }

        private static String describeChunks(List<VectorSearchService.ChunkMatch> chunks) {
            return chunks.stream()
                    .map(c -> "p" + c.pageNumber() + " " + c.blockType() + " " + c.blockId())
                    .collect(Collectors.joining("\n"));
        }

        private static String format(double value) {
            return String.format(Locale.ROOT, "%.3f", value);
        }
    }
}
