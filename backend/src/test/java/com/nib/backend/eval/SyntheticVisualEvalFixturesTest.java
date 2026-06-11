package com.nib.backend.eval;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SyntheticVisualEvalFixturesTest {

    private static final Path EVAL_DIR = Path.of("src/test/resources/eval");
    private static final Path PDF_DIR = EVAL_DIR.resolve("pdfs");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @BeforeAll
    static void generateFixtures() throws IOException {
        SyntheticVisualEvalPdfGenerator.main(new String[0]);
    }

    @Test
    void generatedVisualFixturesAreReadableOnePagePdfs() throws IOException {
        List<Path> pdfs = List.of(
                PDF_DIR.resolve("synthetic-bar-chart-revenue.pdf"),
                PDF_DIR.resolve("synthetic-line-chart-churn.pdf"),
                PDF_DIR.resolve("synthetic-stacked-chart-regions.pdf"),
                PDF_DIR.resolve("synthetic-prompt-injection-visual.pdf"),
                PDF_DIR.resolve("synthetic-resume-rafael.pdf"),
                PDF_DIR.resolve("synthetic-table-cloud-costs.pdf")
        );

        for (Path pdf : pdfs) {
            assertThat(pdf).exists();
            assertThat(Files.size(pdf)).isGreaterThan(1_000L);
            try (PDDocument document = Loader.loadPDF(pdf.toFile())) {
                assertThat(document.getNumberOfPages()).isEqualTo(1);
            }
        }
    }

    @Test
    void evalCasesReferenceExistingFixturesAndHaveScorableExpectations() throws IOException {
        List<RagEvalCase> cases = OBJECT_MAPPER.readValue(
                EVAL_DIR.resolve("cases.json").toFile(),
                new TypeReference<>() {}
        );

        assertThat(cases).hasSizeGreaterThanOrEqualTo(12);
        assertThat(cases).allSatisfy(evalCase -> {
            assertThat(evalCase.id()).isNotBlank();
            assertThat(evalCase.question()).isNotBlank();
            assertThat(EVAL_DIR.resolve(evalCase.pdf())).exists();
            assertThat(evalCase.expectedAnswerContainsOrEmpty()).isNotEmpty();
            if (!evalCase.expectsRefusal()) {
                assertThat(evalCase.minCitationCount()).isNotNull();
            }
        });
    }

    @Test
    void chartFixtureAnswersAreNotLeakedAsPlainPdfText() throws IOException {
        try (PDDocument document = Loader.loadPDF(PDF_DIR.resolve("synthetic-bar-chart-revenue.pdf").toFile())) {
            String text = new PDFTextStripper().getText(document);

            assertThat(text).doesNotContain("Product Beta");
            assertThat(text).doesNotContain("highest revenue");
            assertThat(text).doesNotContain("Ground truth");
        }
    }
}
