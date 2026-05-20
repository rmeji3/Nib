package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VectorSearchService {

    private final JdbcTemplate jdbcTemplate;

    public record ChunkMatch(
            UUID blockId,
            UUID documentId,
            int pageNumber,
            int chunkIndex,
            String extractedText,
            double similarity
    ) {}

    /**
     * Stores an embedding vector for a content block.
     * Uses raw SQL because JPA does not support the pgvector type.
     */
    public void saveEmbedding(UUID blockId, float[] embedding, String modelVersion) {
        String vectorStr = EmbeddingService.toVectorString(embedding);
        jdbcTemplate.update(
                "INSERT INTO embeddings (id, block_id, embedding, model_version) VALUES (gen_random_uuid(), ?, ?::vector, ?)",
                blockId, vectorStr, modelVersion
        );
    }

    /**
     * Retrieves the top-k most similar chunks for a given query embedding and document.
     * Calls the match_chunks() SQL function defined in the migration.
     */
    public List<ChunkMatch> search(UUID documentId, float[] queryEmbedding, int topK) {
        String vectorStr = EmbeddingService.toVectorString(queryEmbedding);
        return jdbcTemplate.query(
                "SELECT * FROM match_chunks(?::vector, ?, ?)",
                (rs, rowNum) -> new ChunkMatch(
                        UUID.fromString(rs.getString("block_id")),
                        UUID.fromString(rs.getString("document_id")),
                        rs.getInt("page_number"),
                        rs.getInt("chunk_index"),
                        rs.getString("extracted_text"),
                        rs.getDouble("similarity")
                ),
                vectorStr, topK, documentId
        );
    }
}
