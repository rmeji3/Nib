package com.nib.backend.eval;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.ChatQueryResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Live end-to-end RAG eval: runs every case in {@code cases.json} against a
 * RUNNING backend (upload → ingest → chat query), scores answers with
 * {@link RagEvalScorer}, computes Ragas-style {@link RagEvalMetrics}, and
 * writes the aggregate {@link RagEvalReport} to
 * {@code target/rag-eval-report.md}.
 *
 * This is the "measure first" tool for retrieval/extraction decisions (for
 * example: is table extraction the bottleneck that would justify a Docling
 * sidecar?) — compare the per-category failures and context metrics across
 * runs before changing the pipeline.
 *
 * Disabled by default; it spends real Gemini/Mistral/Vision budget. Run with:
 * <pre>
 *   # backend running locally with the dev profile (cost controls off)
 *   NIB_LIVE_EVAL_BASE_URL=http://localhost:8080 ./mvnw test -Dtest=LiveRagEvalTest
 * </pre>
 */
@EnabledIfEnvironmentVariable(named = "NIB_LIVE_EVAL_BASE_URL", matches = ".+")
class LiveRagEvalTest {

    private static final Path CASES_PATH = Path.of("src/test/resources/eval/cases.json");
    private static final Path FIXTURES_ROOT = Path.of("src/test/resources/eval");
    private static final Path REPORT_PATH = Path.of("target/rag-eval-report.md");

    private static final int INGESTION_TIMEOUT_SECONDS = 300;
    private static final int INGESTION_POLL_SECONDS = 5;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private final RestClient restClient = RestClient.builder()
            .baseUrl(System.getenv("NIB_LIVE_EVAL_BASE_URL"))
            .build();

    @Test
    void runsAllEvalCasesAgainstLiveBackendAndWritesReport() throws Exception {
        List<RagEvalCase> cases = objectMapper.readValue(CASES_PATH.toFile(), new TypeReference<>() {});
        assertThat(cases).isNotEmpty();

        String token = registerThrowawayUser();

        // Upload + ingest each unique fixture PDF once.
        Map<String, UUID> documentIdsByPdf = new HashMap<>();
        for (String pdf : cases.stream().map(RagEvalCase::pdf).collect(java.util.stream.Collectors
                .toCollection(LinkedHashSet::new))) {
            UUID documentId = uploadPdf(token, pdf);
            awaitIngestion(token, documentId, pdf);
            documentIdsByPdf.put(pdf, documentId);
        }

        // Ask every question in a fresh session and score the answers.
        List<RagEvalResult> results = new ArrayList<>();
        List<RagEvalMetrics> metrics = new ArrayList<>();
        for (RagEvalCase evalCase : cases) {
            UUID documentId = documentIdsByPdf.get(evalCase.pdf());
            UUID sessionId = createSession(token, documentId);
            ChatQueryResponse response = query(token, sessionId, evalCase.question());
            results.add(RagEvalScorer.score(evalCase, response));
            metrics.add(RagEvalMetricsCalculator.compute(evalCase, response));
        }

        RagEvalReport report = RagEvalReport.from(metrics);
        StringBuilder document = new StringBuilder(report.toMarkdown());
        document.append("\n## Per-case results\n\n");
        for (RagEvalResult result : results) {
            document.append("- ").append(result.passed() ? "PASS" : "FAIL").append(" `")
                    .append(result.caseId()).append('`');
            if (!result.passed()) {
                document.append(": ").append(String.join("; ", result.failures()));
            }
            document.append('\n');
        }
        Files.createDirectories(REPORT_PATH.getParent());
        Files.writeString(REPORT_PATH, document.toString());
        System.out.println(document);

        List<String> failed = results.stream()
                .filter(r -> !r.passed())
                .map(r -> r.caseId() + " → " + String.join("; ", r.failures()))
                .toList();
        assertThat(failed)
                .withFailMessage("Eval regressions (full report: %s):%n%s",
                        REPORT_PATH, String.join("\n", failed))
                .isEmpty();
    }

    // HTTP responses are read as Maps: Spring Boot 4's RestClient converters use
    // Jackson 3 (tools.jackson), whose JsonNode is a different type than the
    // Jackson 2 node used to load cases.json.
    private String registerThrowawayUser() {
        String email = "eval-" + UUID.randomUUID() + "@nib-eval.local";
        @SuppressWarnings("unchecked")
        Map<String, Object> auth = restClient.post()
                .uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Eval Runner", "email", email, "password", "eval-" + UUID.randomUUID()))
                .retrieve()
                .body(Map.class);
        assertThat(auth).isNotNull().containsKey("token");
        return String.valueOf(auth.get("token"));
    }

    private UUID uploadPdf(String token, String pdf) throws Exception {
        Path path = FIXTURES_ROOT.resolve(pdf);
        byte[] bytes = Files.readAllBytes(path);
        String filename = path.getFileName().toString();

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("files", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });

        @SuppressWarnings("unchecked")
        Map<String, Object> doc = restClient.post()
                .uri("/api/v1/documents/upload")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(form)
                .retrieve()
                .body(Map.class);
        assertThat(doc).isNotNull().containsKey("id");
        return UUID.fromString(String.valueOf(doc.get("id")));
    }

    private void awaitIngestion(String token, UUID documentId, String pdf) throws InterruptedException {
        long deadline = System.currentTimeMillis() + INGESTION_TIMEOUT_SECONDS * 1000L;
        while (System.currentTimeMillis() < deadline) {
            Map<String, Object> status;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = restClient.get()
                        .uri("/api/v1/documents/{id}/status", documentId)
                        .header("Authorization", "Bearer " + token)
                        .retrieve()
                        .body(Map.class);
                status = body;
            } catch (org.springframework.web.client.ResourceAccessException ex) {
                // Dev backends restart; ingestion state is persisted, so keep polling.
                System.out.println("Backend unreachable while polling " + pdf + " (" + ex.getMessage()
                        + ") — retrying");
                Thread.sleep(INGESTION_POLL_SECONDS * 1000L);
                continue;
            }
            String state = status == null || status.get("status") == null
                    ? "UNKNOWN"
                    : String.valueOf(status.get("status"));
            if ("COMPLETE".equalsIgnoreCase(state)) {
                return;
            }
            if ("FAILED".equalsIgnoreCase(state)) {
                throw new IllegalStateException("Ingestion failed for " + pdf + ": " + status);
            }
            Thread.sleep(INGESTION_POLL_SECONDS * 1000L);
        }
        throw new IllegalStateException("Ingestion timed out after " + INGESTION_TIMEOUT_SECONDS
                + "s for " + pdf);
    }

    private UUID createSession(String token, UUID documentId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> session = restClient.post()
                .uri("/api/v1/chat/sessions/document/" + documentId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(Map.class);
        assertThat(session).isNotNull().containsKey("id");
        return UUID.fromString(String.valueOf(session.get("id")));
    }

    private ChatQueryResponse query(String token, UUID sessionId, String question) {
        return restClient.post()
                .uri("/api/v1/chat/sessions/{sessionId}/query", sessionId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("question", question))
                .retrieve()
                .body(ChatQueryResponse.class);
    }
}
