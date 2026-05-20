package com.nib.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class TextExtractionService {

    /**
     * Extracts text from each page of a PDF.
     * Returns a list where index i contains the text for page i+1.
     */
    public List<String> extractPages(byte[] pdfBytes) {
        List<String> pages = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            int total = doc.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            for (int i = 1; i <= total; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String text = stripper.getText(doc);
                pages.add(text != null ? text.trim() : "");
            }
            log.debug("Extracted text from {} pages", total);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to extract text from PDF", ex);
        }
        return pages;
    }
}
