package com.nib.backend.eval;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.CitationDto;
import com.nib.backend.dto.GroundingVerificationDto;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RagEvalScorerTest {

    private static final Path CASES_PATH = Path.of("src/test/resources/eval/cases.json");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Test
    void scorerAcceptsResponsesThatSatisfyCaseExpectations() throws IOException {
        List<RagEvalCase> cases = loadCases();

        for (RagEvalCase evalCase : cases) {
            ChatQueryResponse response = satisfyingResponseFor(evalCase);
            RagEvalResult result = RagEvalScorer.score(evalCase, response);

            assertThat(result.failures())
                    .as(evalCase.id())
                    .isEmpty();
            assertThat(result.passed()).isTrue();
        }
    }

    @Test
    void scorerFlagsWrongAnswerCitationAndConfidence() throws IOException {
        RagEvalCase evalCase = loadCases().stream()
                .filter(item -> item.id().equals("resume_university_lookup"))
                .findFirst()
                .orElseThrow();

        ChatQueryResponse badResponse = response(
                "Rafael went to Example University [B9].",
                List.of(citation(2, "B9")),
                false,
                0.25,
                false
        );

        RagEvalResult result = RagEvalScorer.score(evalCase, badResponse);

        assertThat(result.passed()).isFalse();
        assertThat(result.failures()).anySatisfy(failure ->
                assertThat(failure).contains("University of Illinois Chicago"));
        assertThat(result.failures()).anySatisfy(failure ->
                assertThat(failure).contains("confidence"));
        assertThat(result.failures()).anySatisfy(failure ->
                assertThat(failure).contains("page 1"));
    }

    @Test
    void scorerCatchesLowSignalRegressionThatAnswersPreviousTopic() throws IOException {
        RagEvalCase evalCase = loadCases().stream()
                .filter(item -> item.id().equals("resume_low_signal_wwww"))
                .findFirst()
                .orElseThrow();

        ChatQueryResponse badResponse = response(
                "Rafael Mejia is a Computer Science student at the University of Illinois Chicago [B1].",
                List.of(citation(1, "B1")),
                false,
                0.94,
                true
        );

        RagEvalResult result = RagEvalScorer.score(evalCase, badResponse);

        assertThat(result.passed()).isFalse();
        assertThat(result.failures()).anySatisfy(failure ->
                assertThat(failure).contains("Expected refused=true"));
        assertThat(result.failures()).anySatisfy(failure ->
                assertThat(failure).contains("forbidden text"));
        assertThat(result.failures()).anySatisfy(failure ->
                assertThat(failure).contains("confidence"));
    }

    private static List<RagEvalCase> loadCases() throws IOException {
        return OBJECT_MAPPER.readValue(CASES_PATH.toFile(), new TypeReference<>() {});
    }

    private static ChatQueryResponse satisfyingResponseFor(RagEvalCase evalCase) {
        String answer = String.join(" ", evalCase.expectedAnswerContainsOrEmpty());
        if (answer.isBlank()) {
            answer = evalCase.expectsRefusal() ? "I cannot find this information." : "Supported answer.";
        }

        int citationCount = Math.max(evalCase.minCitationCount() == null ? 0 : evalCase.minCitationCount(), 0);
        List<CitationDto> citations = java.util.stream.IntStream.range(0, citationCount)
                .mapToObj(index -> citation(evalCase.expectedPage() == null ? 1 : evalCase.expectedPage(), "B" + (index + 1)))
                .toList();

        double confidence = evalCase.expectsRefusal()
                ? Math.min(evalCase.maxConfidence() == null ? 0.0 : evalCase.maxConfidence(), 0.05)
                : Math.max(evalCase.minConfidence() == null ? 0.8 : evalCase.minConfidence(), 0.8);

        return response(
                answer + (citations.isEmpty() ? "" : " [B1]."),
                citations,
                evalCase.expectsRefusal(),
                confidence,
                !evalCase.requiresGroundingVerified() || !evalCase.expectsRefusal()
        );
    }

    private static ChatQueryResponse response(
            String answer,
            List<CitationDto> citations,
            boolean refused,
            double confidence,
            boolean verified
    ) {
        return new ChatQueryResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                answer,
                citations,
                "eval-model",
                Instant.now().toString(),
                confidence,
                citations.isEmpty() ? 0.0 : 1.0,
                new GroundingVerificationDto(
                        verified,
                        refused ? "REFUSED" : "VERIFIED",
                        verified ? 1.0 : 0.0,
                        1,
                        citations.isEmpty() ? 0 : 1,
                        List.of(),
                        List.of(),
                        citations.stream().map(CitationDto::blockId).toList()
                ),
                refused
        );
    }

    private static CitationDto citation(int pageNumber, String sourceId) {
        UUID blockId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        return new CitationDto(
                pageNumber,
                sourceId,
                blockId,
                documentId,
                "text",
                0,
                "text",
                "Evidence text",
                null,
                null,
                null
        );
    }
}
