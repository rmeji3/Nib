-- Phase 4: Hybrid Search — add tsvector column for BM25-style full-text search.
-- Combined with pgvector cosine similarity via Reciprocal Rank Fusion (RRF)
-- for +15-30% recall on exact keyword matches (product names, codes, identifiers).

-- 1. Add the tsvector column.
ALTER TABLE content_blocks
  ADD COLUMN IF NOT EXISTS search_tsvector tsvector;

-- 2. Populate tsvector for all existing rows.
UPDATE content_blocks
SET search_tsvector = to_tsvector('english', coalesce(extracted_text, ''))
WHERE search_tsvector IS NULL;

-- 3. Create a GIN index for fast full-text search.
CREATE INDEX IF NOT EXISTS idx_content_blocks_tsvector
  ON content_blocks USING gin (search_tsvector);

-- 4. Create a trigger to auto-populate tsvector on INSERT and UPDATE,
--    so the ingestion pipeline doesn't need to set it manually.
CREATE OR REPLACE FUNCTION content_blocks_tsvector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_tsvector := to_tsvector('english', coalesce(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_blocks_tsvector ON content_blocks;
CREATE TRIGGER trg_content_blocks_tsvector
  BEFORE INSERT OR UPDATE OF extracted_text ON content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION content_blocks_tsvector_trigger();
