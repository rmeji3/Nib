package com.nib.backend.service;

import com.nib.backend.dto.BBox;
import com.nib.backend.model.ContentBlock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
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
            String blockType,
            double similarity,
            BBox bbox,            // null for blocks ingested before the bbox pipeline
            Double pageWidth,     // null when bbox is null
            Double pageHeight     // null when bbox is null
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
        // Refresh planner statistics so the HNSW index covers the new rows immediately.
        // Without this, the first query after a bulk insert can return 0 results.
        jdbcTemplate.execute("ANALYZE embeddings");
        log.debug("Batch-inserted {} embeddings and ran ANALYZE", blocks.size());
    }

    /**
     * Returns every visual_summary block for a document, ordered by page number.
     * Bypasses similarity search — used by aggregation queries ("most expensive",
     * "list all", "compare") that need full coverage rather than top-k relevance.
     * Similarity is set to 0.0 since it's unused in this context.
     */
    public List<ChunkMatch> getAllVisualBlocks(UUID documentId) {
        return jdbcTemplate.query(
                """
                SELECT cb.id          AS block_id,
                       cb.document_id,
                       cb.page_number,
                       cb.chunk_index,
                       cb.extracted_text,
                       cb.block_type,
                       cb.bbox_x,
                       cb.bbox_y,
                       cb.bbox_width,
                       cb.bbox_height,
                       cb.page_width,
                       cb.page_height,
                       0.0            AS similarity
                FROM   content_blocks cb
                WHERE  cb.document_id = ?
                  AND  cb.block_type = 'visual_summary'
                ORDER  BY cb.page_number, cb.chunk_index
                """,
                (rs, rowNum) -> mapRow(rs),
                documentId
        );
    }

    /**
     * Retrieves the top-k most similar chunks for a given query embedding and document.
     *
     * Uses a direct JOIN rather than the match_chunks() SQL function so we can
     * return block_type (needed to label text vs visual context in the chat prompt).
     * Postgres will use the HNSW index via the ORDER BY embedding <=> ? ... LIMIT clause.
     */
    public List<ChunkMatch> search(UUID documentId, float[] queryEmbedding, int topK) {
        String vectorStr = EmbeddingService.toVectorString(queryEmbedding);
        return jdbcTemplate.query(
                """
                SELECT cb.id          AS block_id,
                       cb.document_id,
                       cb.page_number,
                       cb.chunk_index,
                       cb.extracted_text,
                       cb.block_type,
                       cb.bbox_x,
                       cb.bbox_y,
                       cb.bbox_width,
                       cb.bbox_height,
                       cb.page_width,
                       cb.page_height,
                       e.embedding <=> ?::vector AS similarity
                FROM   embeddings e
                JOIN   content_blocks cb ON cb.id = e.block_id
                WHERE  cb.document_id = ?
                ORDER  BY similarity
                LIMIT  ?
                """,
                (rs, rowNum) -> mapRow(rs),
                vectorStr, documentId, topK
        );
    }

    /** Shared row mapper for ChunkMatch — bbox + page dims are nullable. */
    private static ChunkMatch mapRow(ResultSet rs) throws SQLException {
        BBox bbox = null;
        double bx = rs.getDouble("bbox_x");
        boolean bboxNull = rs.wasNull();
        if (!bboxNull) {
            double by = rs.getDouble("bbox_y");
            double bw = rs.getDouble("bbox_width");
            double bh = rs.getDouble("bbox_height");
            bbox = new BBox(bx, by, bw, bh);
        }
        Double pageWidth = rs.getObject("page_width", Double.class);
        Double pageHeight = rs.getObject("page_height", Double.class);
        return new ChunkMatch(
                UUID.fromString(rs.getString("block_id")),
                UUID.fromString(rs.getString("document_id")),
                rs.getInt("page_number"),
                rs.getInt("chunk_index"),
                rs.getString("extracted_text"),
                rs.getString("block_type"),
                rs.getDouble("similarity"),
                bbox,
                pageWidth,
                pageHeight
        );
    }
}
