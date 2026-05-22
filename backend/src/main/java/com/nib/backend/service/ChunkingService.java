package com.nib.backend.service;

import com.nib.backend.dto.BBox;
import com.nib.backend.service.PositionedTextExtractor.PositionedPage;
import com.nib.backend.service.PositionedTextExtractor.PositionedRun;
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
     * Text chunk plus the union bbox of every PositionedRun that contributed
     * to it. {@link #bbox()} is null when no positional data was available
     * (e.g. blank pages or scans without a text layer).
     */
    public record PositionedChunk(
            int chunkIndex,
            String text,
            BBox bbox
    ) {}

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

    /**
     * Position-aware variant of {@link #chunk(String)}. Produces the same
     * character chunks as `chunk(page.text())` but also computes the union
     * bounding box of every PositionedRun whose offset range overlaps the
     * chunk's character range. Used by the ingestion pipeline to give each
     * stored ContentBlock a precise bbox on the rendered page.
     */
    public List<PositionedChunk> chunkWithPositions(PositionedPage page) {
        List<PositionedChunk> result = new ArrayList<>();
        if (page == null) return result;
        String text = page.text();
        if (text == null || text.isBlank()) return result;

        int start = 0;
        int length = text.length();
        int chunkIndex = 0;

        while (start < length) {
            int end = Math.min(start + maxChars, length);
            if (end < length) {
                int snap = text.lastIndexOf(' ', end);
                if (snap > start) end = snap;
            }

            // Find the trimmed range INSIDE [start, end) so the bbox excludes
            // any leading/trailing whitespace.
            int trimStart = start;
            while (trimStart < end && Character.isWhitespace(text.charAt(trimStart))) trimStart++;
            int trimEnd = end;
            while (trimEnd > trimStart && Character.isWhitespace(text.charAt(trimEnd - 1))) trimEnd--;

            if (trimEnd > trimStart) {
                String chunkText = text.substring(trimStart, trimEnd);
                BBox bbox = unionBboxForRange(page.runs(), trimStart, trimEnd);
                result.add(new PositionedChunk(chunkIndex, chunkText, bbox));
                chunkIndex++;
            }

            int next = end - overlapChars;
            start = Math.max(next, start + 1);
        }

        return result;
    }

    /** Rough token count estimate: 1 token ≈ 4 characters. */
    public int estimateTokens(String text) {
        return text == null ? 0 : Math.max(1, text.length() / 4);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private static BBox unionBboxForRange(List<PositionedRun> runs, int rangeStart, int rangeEnd) {
        if (runs == null || runs.isEmpty()) return null;
        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        boolean any = false;
        for (PositionedRun run : runs) {
            // Skip runs that don't overlap [rangeStart, rangeEnd)
            if (run.endOffset() <= rangeStart || run.startOffset() >= rangeEnd) continue;
            any = true;
            double right = run.x() + run.width();
            double bottom = run.y() + run.height();
            if (run.x() < minX) minX = run.x();
            if (run.y() < minY) minY = run.y();
            if (right > maxX) maxX = right;
            if (bottom > maxY) maxY = bottom;
        }
        if (!any) return null;
        return new BBox(minX, minY, maxX - minX, maxY - minY);
    }
}
