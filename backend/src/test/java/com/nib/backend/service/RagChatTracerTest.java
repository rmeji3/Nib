package com.nib.backend.service;

import com.nib.backend.dto.GroundingVerificationDto;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.test.simple.SimpleSpan;
import io.micrometer.tracing.test.simple.SimpleTracer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RagChatTracerTest {

    private final SimpleTracer simpleTracer = new SimpleTracer();

    @SuppressWarnings("unchecked")
    private RagChatTracer buildTracer(boolean enabled, boolean includePayloads) {
        ObjectProvider<Tracer> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(simpleTracer);
        RagChatTracer tracer = new RagChatTracer(provider);
        ReflectionTestUtils.setField(tracer, "enabled", enabled);
        ReflectionTestUtils.setField(tracer, "includePayloads", includePayloads);
        ReflectionTestUtils.setField(tracer, "maxPayloadChars", 50);
        return tracer;
    }

    @Test
    void emitsOneSpanPerRagStageWithOutcomeOnRoot() {
        RagChatTracer tracer = buildTracer(true, true);

        RagChatTracer.ChatTrace trace = tracer.startTrace(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "What was revenue?");
        trace.recordRewrite("What about it?", "What was revenue?");
        trace.recordRetrieval(40, List.of(), 0.91, false);
        trace.recordRerank(true, 0.84, 5);
        trace.recordGeneration("prompt text", "Revenue was $42.3M [B1].", "gemini-2.5-flash",
                new GeminiTextClient.TokenUsage(100, 20, 120));
        trace.recordVerification(true, false, List.of(),
                new GroundingVerificationDto(true, "VERIFIED", 1.0, 1, 1, List.of(), List.of(), List.of()));
        trace.end("answered", 0.93, 1.0, "Revenue was $42.3M [B1].");

        List<String> names = simpleTracer.getSpans().stream().map(SimpleSpan::getName).toList();
        assertThat(names).containsExactlyInAnyOrder(
                "rag.chat.query", "rag.query.rewrite", "rag.retrieval",
                "rag.rerank", "rag.generation", "rag.verification");

        SimpleSpan root = simpleTracer.getSpans().stream()
                .filter(s -> "rag.chat.query".equals(s.getName())).findFirst().orElseThrow();
        assertThat(root.getTags()).containsEntry("rag.outcome", "answered");
        assertThat(root.getTags()).containsEntry("rag.confidence", "0.930");

        SimpleSpan generation = simpleTracer.getSpans().stream()
                .filter(s -> "rag.generation".equals(s.getName())).findFirst().orElseThrow();
        assertThat(generation.getTags()).containsEntry("langfuse.observation.type", "generation");
        assertThat(generation.getTags()).containsEntry("gen_ai.usage.input_tokens", "100");
        assertThat(generation.getTags()).containsEntry("gen_ai.request.model", "gemini-2.5-flash");
    }

    @Test
    void truncatesPayloadsAndCanExcludeThemEntirely() {
        RagChatTracer tracer = buildTracer(true, true);
        String longQuestion = "Q".repeat(200);
        RagChatTracer.ChatTrace trace = tracer.startTrace(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), longQuestion);
        trace.end("answered", 1.0, 1.0, "ok");

        SimpleSpan root = simpleTracer.getSpans().getFirst();
        assertThat(root.getTags().get("langfuse.observation.input"))
                .hasSizeLessThan(80)
                .endsWith("…[truncated]");

        RagChatTracer noPayloads = buildTracer(true, false);
        RagChatTracer.ChatTrace redacted = noPayloads.startTrace(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "secret document question");
        redacted.end("answered", 1.0, 1.0, "secret answer");
        SimpleSpan redactedRoot = simpleTracer.getSpans().getLast();
        assertThat(redactedRoot.getTags().get("langfuse.observation.input"))
                .isEqualTo("[payloads disabled]");
    }

    @Test
    void isANoOpWhenDisabled() {
        RagChatTracer tracer = buildTracer(false, true);

        RagChatTracer.ChatTrace trace = tracer.startTrace(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "question");
        trace.recordRewrite("a", "b");
        trace.recordRetrieval(5, List.of(), 0.5, false);
        trace.end("answered", 0.5, 0.5, "answer");

        assertThat(simpleTracer.getSpans()).isEmpty();
    }
}
