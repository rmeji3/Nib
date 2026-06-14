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
            int end = findChunkEnd(text, start, Math.min(start + maxChars, length));

            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) chunks.add(chunk);

            if (end >= length) break;

            start = findNextChunkStart(text, start, end, overlapChars);
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
            int end = findChunkEnd(text, start, Math.min(start + maxChars, length));

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

            if (end >= length) break;

            start = findNextChunkStart(text, start, end, overlapChars);
        }

        return result;
    }

    /** Rough token count estimate: 1 token ≈ 4 characters. */
    public int estimateTokens(String text) {
        return text == null ? 0 : Math.max(1, text.length() / 4);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private int findChunkEnd(String text, int start, int maxEnd) {
        if (maxEnd >= text.length()) return text.length();

        int snap = text.lastIndexOf("\n\n", maxEnd);
        if (snap > start) return snap + 2;

        snap = text.lastIndexOf('\n', maxEnd);
        if (snap > start) return snap + 1;

        snap = text.lastIndexOf(". ", maxEnd);
        if (snap > start) return snap + 2;

        snap = text.lastIndexOf(' ', maxEnd);
        if (snap > start) return snap + 1;

        return maxEnd;
    }

    private int findNextChunkStart(String text, int currentStart, int currentEnd, int overlapChars) {
        // If the chunk ended cleanly at a paragraph boundary (\n\n), don't overlap into the
        // previous paragraph. This prevents unrelated sections from bleeding into the next
        // chunk and messing up citation UI bounding boxes.
        if (currentEnd >= 2 && text.charAt(currentEnd - 1) == '\n' && text.charAt(currentEnd - 2) == '\n') {
            return currentEnd;
        }

        int target = Math.max(currentStart + 1, currentEnd - overlapChars);

        int snap = text.lastIndexOf("\n\n", target);
        if (snap > currentStart) return snap + 2;

        snap = text.lastIndexOf('\n', target);
        if (snap > currentStart) return snap + 1;

        snap = text.lastIndexOf(". ", target);
        if (snap > currentStart) return snap + 2;

        snap = text.lastIndexOf(' ', target);
        if (snap > currentStart) return snap + 1;

        return target;
    }

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
