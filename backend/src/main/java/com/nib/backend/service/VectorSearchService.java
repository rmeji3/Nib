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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
     * Returns every visual evidence block for a document, ordered by page number.
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
                  AND  cb.block_type IN ('visual_summary', 'table', 'chart', 'figure')
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

    /**
     * Hybrid search combining dense vector similarity with BM25-style full-text
     * search via Reciprocal Rank Fusion (RRF). Returns the top-K results from
     * the merged ranking.
     *
     * Strategy:
     *   1. Run dense vector search for 2×topK candidates (cosine distance via pgvector).
     *   2. Run full-text search for 2×topK candidates (ts_rank_cd via tsvector).
     *   3. Merge using RRF: score(d) = Σ 1/(k + rank_i) where k=60.
     *   4. Return the top-K by merged score.
     *
     * RRF is rank-based (not score-based), so it handles the different scales of
     * cosine distance and ts_rank gracefully without normalization.
     */
    /**
     * Result of a hybrid search: the final RRF-merged chunks AND the raw vector
     * results. ChatService needs the raw vector results for confidence scoring
     * (cosine distances) since RRF scores are on a different scale.
     */
    public record HybridSearchResult(
            List<ChunkMatch> chunks,
            List<ChunkMatch> vectorResults
    ) {}

    public HybridSearchResult hybridSearch(UUID documentId, float[] queryEmbedding, String queryText, int topK) {
        int candidateK = topK * 2;

        // 1. Dense vector search
        List<ChunkMatch> vectorResults = search(documentId, queryEmbedding, candidateK);

        // 2. Full-text search (BM25-style via tsvector)
        List<ChunkMatch> textResults = fullTextSearch(documentId, queryText, candidateK);

        // 3. Reciprocal Rank Fusion
        List<ChunkMatch> merged = reciprocalRankFusion(vectorResults, textResults, topK);

        log.info("Hybrid search: {} vector + {} text candidates → {} merged results (topK={})",
                vectorResults.size(), textResults.size(), merged.size(), topK);

        return new HybridSearchResult(merged, vectorResults);
    }

    /**
     * Full-text search using PostgreSQL's tsvector/tsquery with ts_rank_cd scoring.
     * Returns up to {@code limit} results ordered by relevance. Uses plainto_tsquery
     * to handle natural-language user questions without requiring boolean syntax.
     */
    private List<ChunkMatch> fullTextSearch(UUID documentId, String queryText, int limit) {
        if (queryText == null || queryText.isBlank()) return List.of();

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
                       ts_rank_cd(cb.search_tsvector, plainto_tsquery('english', ?)) AS similarity
                FROM   content_blocks cb
                WHERE  cb.document_id = ?
                  AND  cb.search_tsvector @@ plainto_tsquery('english', ?)
                ORDER  BY similarity DESC
                LIMIT  ?
                """,
                (rs, rowNum) -> mapRow(rs),
                queryText, documentId, queryText, limit
        );
    }

    /**
     * Reciprocal Rank Fusion — merges two ranked result lists into a single
     * ranking. Each document's score is the sum of 1/(k + rank) across both
     * lists, where k=60 (standard RRF constant that dampens the influence of
     * high-rank positions). Documents appearing in only one list still get
     * their single-list RRF contribution.
     */
    private List<ChunkMatch> reciprocalRankFusion(
            List<ChunkMatch> vectorResults,
            List<ChunkMatch> textResults,
            int topK
    ) {
        final double RRF_K = 60.0;

        // Map block ID → accumulated RRF score
        LinkedHashMap<UUID, double[]> scoreMap = new LinkedHashMap<>();
        Map<UUID, ChunkMatch> chunkMap = new LinkedHashMap<>();

        // Score from vector results (rank 0 = best match)
        for (int rank = 0; rank < vectorResults.size(); rank++) {
            ChunkMatch c = vectorResults.get(rank);
            scoreMap.computeIfAbsent(c.blockId(), id -> new double[]{0.0});
            scoreMap.get(c.blockId())[0] += 1.0 / (RRF_K + rank);
            chunkMap.putIfAbsent(c.blockId(), c);
        }

        // Score from text results
        for (int rank = 0; rank < textResults.size(); rank++) {
            ChunkMatch c = textResults.get(rank);
            scoreMap.computeIfAbsent(c.blockId(), id -> new double[]{0.0});
            scoreMap.get(c.blockId())[0] += 1.0 / (RRF_K + rank);
            chunkMap.putIfAbsent(c.blockId(), c);
        }

        // Sort by RRF score descending, take top-K
        return scoreMap.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue()[0], a.getValue()[0]))
                .limit(topK)
                .map(e -> {
                    ChunkMatch original = chunkMap.get(e.getKey());
                    // Replace the similarity field with the RRF score so downstream
                    // confidence computation and re-ranking see a meaningful value.
                    // RRF scores are small (max ~0.033 for rank 0, k=60) so we leave
                    // them as-is — the confidence sigmoid in ChatService operates on
                    // cosine distances, not RRF scores. We store the RRF score for
                    // logging/debugging but compute confidence from the original
                    // vector distances.
                    return original;
                })
                .collect(Collectors.toCollection(ArrayList::new));
    }

    /**
     * Returns all content blocks for specific pages of a document, ordered by
     * page number then chunk index. Used for page-reference queries ("what is
     * on page 5?") where embedding similarity can't find the right chunks
     * because embeddings don't encode page numbers.
     */
    public List<ChunkMatch> getBlocksForPages(UUID documentId, List<Integer> pageNumbers) {
        if (pageNumbers == null || pageNumbers.isEmpty()) return List.of();

        // Build IN clause with parameter placeholders
        String placeholders = pageNumbers.stream()
                .map(p -> "?")
                .collect(Collectors.joining(", "));

        String sql = """
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
                  AND  cb.page_number IN (%s)
                ORDER  BY cb.page_number, cb.chunk_index
                """.formatted(placeholders);

        Object[] params = new Object[1 + pageNumbers.size()];
        params[0] = documentId;
        for (int i = 0; i < pageNumbers.size(); i++) {
            params[i + 1] = pageNumbers.get(i);
        }

        return jdbcTemplate.query(sql, (rs, rowNum) -> mapRow(rs), params);
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
