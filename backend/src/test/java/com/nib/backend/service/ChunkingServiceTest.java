package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChunkingServiceTest {

    private ChunkingService buildService(int maxChars, int overlapChars) {
        ChunkingService service = new ChunkingService();
        ReflectionTestUtils.setField(service, "maxChars", maxChars);
        ReflectionTestUtils.setField(service, "overlapChars", overlapChars);
        return service;
    }

    @Test
    void chunkStopsAtEndOfTextInsteadOfEmittingSuffixFragments() {
        ChunkingService service = buildService(2000, 300);
        // ~5000 chars of word-like text — long enough for 3 windows.
        String text = "word ".repeat(1000).trim();

        List<String> chunks = service.chunk(text);

        // Regression guard: the tail used to degenerate into one chunk per
        // overlap character ("ing.", "ng.", "g.", ...) — ~300 junk chunks.
        assertThat(chunks).hasSizeLessThanOrEqualTo(4);
        assertThat(chunks.get(chunks.size() - 1)).endsWith("word");
        for (String chunk : chunks) {
            assertThat(chunk.length()).isGreaterThan(300);
        }
    }

    @Test
    void chunksOverlapAndCoverTheFullText() {
        ChunkingService service = buildService(2000, 300);
        String text = "word ".repeat(1000).trim();

        List<String> chunks = service.chunk(text);

        assertThat(chunks).hasSizeGreaterThan(1);
        // Every chunk after the first starts with text from the previous chunk's tail.
        for (int i = 1; i < chunks.size(); i++) {
            String previousTail = chunks.get(i - 1).substring(chunks.get(i - 1).length() - 50);
            assertThat(chunks.get(i)).contains(previousTail.substring(previousTail.indexOf(' ') + 1, 50));
        }
        // The final chunk reaches the end of the source text.
        assertThat(text).endsWith(chunks.get(chunks.size() - 1).substring(
                chunks.get(chunks.size() - 1).length() - 20));
    }

    @Test
    void shortTextYieldsExactlyOneChunk() {
        ChunkingService service = buildService(2000, 300);

        List<String> chunks = service.chunk("A short resume line about University of Illinois Chicago.");

        assertThat(chunks).containsExactly("A short resume line about University of Illinois Chicago.");
    }
}
