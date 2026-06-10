package com.nib.backend.eval;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SyntheticVisualEvalFixturesTest {

    private static final Path EVAL_DIR = Path.of("src/test/resources/eval");
    private static final Path PDF_DIR = EVAL_DIR.resolve("pdfs");

    @Test
    void generatedVisualFixturesAreReadableOnePagePdfs() throws IOException {
        List<Path> pdfs = List.of(
                PDF_DIR.resolve("synthetic-bar-chart-revenue.pdf"),
                PDF_DIR.resolve("synthetic-line-chart-churn.pdf"),
                PDF_DIR.resolve("synthetic-stacked-chart-regions.pdf"),
                PDF_DIR.resolve("synthetic-prompt-injection-visual.pdf")
        );

        for (Path pdf : pdfs) {
            assertThat(pdf).exists();
            assertThat(Files.size(pdf)).isGreaterThan(10_000L);
            try (PDDocument document = Loader.loadPDF(pdf.toFile())) {
                assertThat(document.getNumberOfPages()).isEqualTo(1);
            }
        }
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
