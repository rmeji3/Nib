-- Replace IVFFlat with HNSW for the embeddings vector index.
--
-- IVFFlat requires `lists ≤ row_count` to return correct results.
-- A fresh document with only 5-15 embeddings and lists=100 means most
-- probes land in empty cells → 0 results returned. HNSW has no such
-- restriction and works correctly from 1 row to millions.
--
-- HNSW params:
--   m = 16            connections per layer (default; good all-round balance)
--   ef_construction = 64   build quality (default; higher → better recall but slower build)
--
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor

DROP INDEX IF EXISTS embeddings_embedding_idx;

CREATE INDEX IF NOT EXISTS embeddings_embedding_hnsw_idx
    ON embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Refresh planner stats after the index change
ANALYZE embeddings;
