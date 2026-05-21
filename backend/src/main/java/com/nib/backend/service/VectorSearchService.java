package com.nib.backend.service;

import com.nib.backend.model.ContentBlock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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
     * Stores a single embedding vector for a content block.
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
     * Batch-inserts embeddings for a list of content blocks in a single JDBC round-trip.
     * Dramatically faster than calling saveEmbedding() in a loop.
     * blocks and embeddings must be the same size and in the same order.
     */
    public void saveEmbeddingsBatch(List<ContentBlock> blocks, List<float[]> embeddings, String modelVersion) {
        if (blocks.isEmpty()) return;
        List<Object[]> batchArgs = new ArrayList<>(blocks.size());
        for (int i = 0; i < blocks.size(); i++) {
            batchArgs.add(new Object[]{
                    blocks.get(i).getId(),
                    EmbeddingService.toVectorString(embeddings.get(i)),
                    modelVersion
            });
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO embeddings (id, block_id, embedding, model_version) VALUES (gen_random_uuid(), ?, ?::vector, ?)",
                batchArgs
        );
        log.debug("Batch-inserted {} embeddings", blocks.size());
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
