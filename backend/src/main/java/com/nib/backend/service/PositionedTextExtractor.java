package com.nib.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * Drop-in replacement for {@link TextExtractionService} that also captures
 * per-text-run bounding boxes. Used by the multimodal ingestion pipeline so
 * each indexed chunk knows where on the page it came from — enabling precise
 * highlight overlays in the PDF viewer.
 *
 * Mechanics: subclasses PDFTextStripper and overrides writeString/line/paragraph
 * separators to write into our own buffer (instead of letting the stripper's
 * Writer accumulate the text). Each writeString call gets its union bbox
 * recorded alongside the character offset range it occupies in the page buffer.
 *
 * Coordinates are emitted in CSS convention: top-left origin, Y increases
 * downward. PDFBox's getYDirAdj already returns Y from the top of the page;
 * we subtract heightDir from the baseline to get the top of each glyph.
 */
@Service
@Slf4j
public class PositionedTextExtractor {

    /**
     * Single page of extracted text plus per-run positional metadata.
     * `text` is identical to what {@link TextExtractionService#extractPages}
     * would have produced — same chunk boundaries still apply.
     */
    public record PositionedPage(
            int pageNumber,
            double pageWidth,
            double pageHeight,
            String text,
            List<PositionedRun> runs
    ) {}

    /**
     * A single text run as PDFBox emitted it via writeString(), with its
     * union bbox and the character range it occupies in {@link PositionedPage#text}.
     */
    public record PositionedRun(
            int startOffset,
            int endOffset,
            String text,
            double x,
            double y,
            double width,
            double height
    ) {}

    /**
     * Extract per-page text and positions for the given PDF bytes.
     * Returns one PositionedPage per PDF page, in page order.
     */
    public List<PositionedPage> extractPages(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            CapturingStripper stripper = new CapturingStripper(doc);
            stripper.setSortByPosition(true);
            stripper.setStartPage(1);
            stripper.setEndPage(doc.getNumberOfPages());
            // Drives extraction; writeText writes to the supplied Writer.
            // Our overrides bypass that writer for text runs but the stripper
            // still calls the page lifecycle hooks we need.
            stripper.writeText(doc, new StringWriter());
            log.debug("Extracted positioned text from {} pages", stripper.pages.size());
            return new ArrayList<>(stripper.pages);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to extract positioned text from PDF", ex);
        }
    }

    // ── Private stripper subclass ─────────────────────────────────────────────

    private static class CapturingStripper extends PDFTextStripper {
        private final List<PositionedPage> pages = new ArrayList<>();
        private final List<PositionedRun> currentRuns = new ArrayList<>();
        private final StringBuilder currentText = new StringBuilder();
        private double currentPageWidth;
        private double currentPageHeight;

        CapturingStripper(PDDocument doc) throws IOException {
            super();
        }

        @Override
        protected void startPage(PDPage page) throws IOException {
            super.startPage(page);
            currentRuns.clear();
            currentText.setLength(0);
            var cropBox = page.getCropBox();
            currentPageWidth = cropBox.getWidth();
            currentPageHeight = cropBox.getHeight();
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
            if (textPositions == null || textPositions.isEmpty()) {
                currentText.append(text);
                return;
            }
            double minX = Double.POSITIVE_INFINITY;
            double minY = Double.POSITIVE_INFINITY;
            double maxX = Double.NEGATIVE_INFINITY;
            double maxY = Double.NEGATIVE_INFINITY;
            for (TextPosition tp : textPositions) {
                double left = tp.getXDirAdj();
                double baseline = tp.getYDirAdj();          // top-down: y at baseline
                double h = tp.getHeightDir();
                double w = tp.getWidthDirAdj();
                double top = baseline - h;                  // top of the glyph
                double right = left + w;
                if (left < minX) minX = left;
                if (top < minY) minY = top;
                if (right > maxX) maxX = right;
                if (baseline > maxY) maxY = baseline;
            }
            int startOffset = currentText.length();
            currentText.append(text);
            int endOffset = currentText.length();
            currentRuns.add(new PositionedRun(
                    startOffset, endOffset, text,
                    minX, minY, maxX - minX, maxY - minY
            ));
        }

        @Override
        protected void writeLineSeparator() throws IOException {
            currentText.append('\n');
        }

        @Override
        protected void writeWordSeparator() throws IOException {
            currentText.append(' ');
        }

        @Override
        protected void writeParagraphSeparator() throws IOException {
            currentText.append("\n\n");
        }

        @Override
        protected void endPage(PDPage page) throws IOException {
            pages.add(new PositionedPage(
                    getCurrentPageNo(),
                    currentPageWidth,
                    currentPageHeight,
                    currentText.toString(),
                    new ArrayList<>(currentRuns)
            ));
            super.endPage(page);
        }
    }
}
