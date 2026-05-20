package com.nib.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChunkingService {

    @Value("${ingestion.chunk.max-chars:2000}")
    private int maxChars;

    @Value("${ingestion.chunk.overlap-chars:200}")
    private int overlapChars;

    /**
     * Splits text into overlapping chunks by character count.
     * Breaks on whitespace boundaries to avoid splitting words.
     * 1 token ≈ 4 chars, so maxChars=2000 ≈ 500 tokens.
     */
    public List<String> chunk(String text) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) return chunks;

        int start = 0;
        int length = text.length();

        while (start < length) {
            int end = Math.min(start + maxChars, length);

            // Snap to nearest whitespace to avoid mid-word splits
            if (end < length) {
                int snap = text.lastIndexOf(' ', end);
                if (snap > start) end = snap;
            }

            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) chunks.add(chunk);

            // Next chunk starts with overlap
            int next = end - overlapChars;
            start = Math.max(next, start + 1); // guarantee forward progress
        }

        return chunks;
    }

    /** Rough token count estimate: 1 token ≈ 4 characters. */
    public int estimateTokens(String text) {
        return text == null ? 0 : Math.max(1, text.length() / 4);
    }
}
