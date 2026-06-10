package com.nib.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Runs idempotent schema migrations on startup that Hibernate {@code ddl-auto=update}
 * cannot handle (tsvector columns, GIN indexes, triggers, functions).
 *
 * Every statement uses IF NOT EXISTS / IF EXISTS guards so re-running is safe.
 * Add new migrations at the bottom of {@link #run} — order matters for
 * dependencies (e.g. column must exist before the index).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1) // run early, before async tasks
public class DatabaseMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Running idempotent database migrations...");
        migrateTsvectorColumn();
        migrateIngestionWarningColumns();
        migrateStructuredVisualEvidenceColumns();
        migrateAnswerAuditTable();
        migrateSemanticCacheTables();
        migrateCostUsageEventsTable();
        log.info("Database migrations complete.");
    }

    /**
     * Phase 4: Hybrid Search — add tsvector column + GIN index + auto-populate
     * trigger on content_blocks for BM25-style full-text search.
     */
    private void migrateTsvectorColumn() {
        // 1. Add column (idempotent)
        jdbcTemplate.execute("""
                ALTER TABLE content_blocks
                  ADD COLUMN IF NOT EXISTS search_tsvector tsvector
                """);

        // 2. Backfill existing rows that have NULL tsvector
        int updated = jdbcTemplate.update("""
                UPDATE content_blocks
                SET search_tsvector = to_tsvector('english', coalesce(extracted_text, ''))
                WHERE search_tsvector IS NULL
                """);
        if (updated > 0) {
            log.info("Backfilled search_tsvector on {} existing content_blocks rows", updated);
        }

        // 3. GIN index (idempotent)
        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_content_blocks_tsvector
                  ON content_blocks USING gin (search_tsvector)
                """);

        // 4. Trigger function + trigger (CREATE OR REPLACE / DROP IF EXISTS = idempotent)
        jdbcTemplate.execute("""
                CREATE OR REPLACE FUNCTION content_blocks_tsvector_trigger()
                RETURNS trigger AS $$
                BEGIN
                  NEW.search_tsvector := to_tsvector('english', coalesce(NEW.extracted_text, ''));
                  RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
                """);

        jdbcTemplate.execute("""
                DROP TRIGGER IF EXISTS trg_content_blocks_tsvector ON content_blocks
                """);

        jdbcTemplate.execute("""
                CREATE TRIGGER trg_content_blocks_tsvector
                  BEFORE INSERT OR UPDATE OF extracted_text ON content_blocks
                  FOR EACH ROW
                  EXECUTE FUNCTION content_blocks_tsvector_trigger()
                """);

        log.info("tsvector column, GIN index, and auto-populate trigger verified on content_blocks");
    }

    /**
     * Phase 1 hardening: surface partial ingestion failures to the API without
     * changing the existing COMPLETE/FAILED status contract.
     */
    private void migrateIngestionWarningColumns() {
        jdbcTemplate.execute("""
                ALTER TABLE ingestion_jobs
                  ADD COLUMN IF NOT EXISTS pages_failed integer
                """);

        int updated = jdbcTemplate.update("""
                UPDATE ingestion_jobs
                SET pages_failed = 0
                WHERE pages_failed IS NULL
                """);
        if (updated > 0) {
            log.info("Backfilled pages_failed on {} existing ingestion_jobs rows", updated);
        }

        jdbcTemplate.execute("""
                ALTER TABLE ingestion_jobs
                  ALTER COLUMN pages_failed SET DEFAULT 0
                """);

        jdbcTemplate.execute("""
                ALTER TABLE ingestion_jobs
                  ALTER COLUMN pages_failed SET NOT NULL
                """);

        jdbcTemplate.execute("""
                ALTER TABLE ingestion_jobs
                  ADD COLUMN IF NOT EXISTS warning_message text
                """);

        log.info("Partial-ingestion warning columns verified on ingestion_jobs");
    }

    /**
     * Multimodal QA hardening: preserve table/chart/figure extraction results
     * as structured evidence instead of only embedding prose summaries.
     */
    private void migrateStructuredVisualEvidenceColumns() {
        jdbcTemplate.execute("""
                ALTER TABLE content_blocks
                  ADD COLUMN IF NOT EXISTS visual_summary text,
                  ADD COLUMN IF NOT EXISTS table_structure jsonb,
                  ADD COLUMN IF NOT EXISTS chart_summary text,
                  ADD COLUMN IF NOT EXISTS axis_labels jsonb,
                  ADD COLUMN IF NOT EXISTS units jsonb,
                  ADD COLUMN IF NOT EXISTS data_points jsonb,
                  ADD COLUMN IF NOT EXISTS figure_crop_path text,
                  ADD COLUMN IF NOT EXISTS figure_caption text,
                  ADD COLUMN IF NOT EXISTS extraction_metadata jsonb
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_content_blocks_block_type_page
                  ON content_blocks (document_id, block_type, page_number)
                """);

        log.info("Structured visual evidence columns verified on content_blocks");
    }

    /**
     * Answer audit records preserve enough retrieval/model telemetry to debug
     * quality regressions and evaluate refusal/citation behavior over time.
     */
    private void migrateAnswerAuditTable() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS answer_audits (
                  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                  session_id uuid NOT NULL,
                  document_id uuid NOT NULL,
                  user_id uuid NOT NULL,
                  user_message_id uuid NOT NULL,
                  assistant_message_id uuid NOT NULL,
                  prompt_version text NOT NULL,
                  model_version text NOT NULL,
                  retrieved_block_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
                  confidence double precision NOT NULL,
                  groundedness double precision NOT NULL,
                  latency_ms bigint NOT NULL,
                  prompt_token_count integer,
                  candidates_token_count integer,
                  total_token_count integer,
                  refused boolean NOT NULL,
                  created_at timestamp NOT NULL DEFAULT now()
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_answer_audits_session_created
                  ON answer_audits (session_id, created_at DESC)
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_answer_audits_document_created
                  ON answer_audits (document_id, created_at DESC)
                """);

        log.info("Answer audit table verified");
    }

    /**
     * Semantic caches lower repeated-query cost:
     *  - embedding_cache stores exact normalized-query embeddings by text hash.
     *  - answer_cache stores high-confidence, grounded answers per document
     *    ingestion version and prompt/model version.
     */
    private void migrateSemanticCacheTables() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS embedding_cache (
                  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                  input_hash text NOT NULL,
                  input_text text NOT NULL,
                  model_version text NOT NULL,
                  embedding vector(1024) NOT NULL,
                  created_at timestamp NOT NULL DEFAULT now(),
                  last_accessed_at timestamp NOT NULL DEFAULT now(),
                  access_count integer NOT NULL DEFAULT 1,
                  CONSTRAINT uq_embedding_cache_input_model UNIQUE (input_hash, model_version)
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_embedding_cache_input_model
                  ON embedding_cache (input_hash, model_version)
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS answer_cache (
                  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                  document_id uuid NOT NULL,
                  document_version_id uuid NOT NULL,
                  query_text text NOT NULL,
                  query_embedding vector(1024) NOT NULL,
                  prompt_version text NOT NULL,
                  model_version text NOT NULL,
                  answer text NOT NULL,
                  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
                  retrieved_block_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
                  confidence double precision NOT NULL,
                  groundedness double precision NOT NULL,
                  created_at timestamp NOT NULL DEFAULT now(),
                  last_accessed_at timestamp NOT NULL DEFAULT now(),
                  access_count integer NOT NULL DEFAULT 1
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_answer_cache_document_version
                  ON answer_cache (document_id, document_version_id, prompt_version, model_version)
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_answer_cache_query_embedding
                  ON answer_cache USING hnsw (query_embedding vector_cosine_ops)
                """);

        log.info("Semantic cache tables verified");
    }

    /**
     * Cost telemetry gives users visibility into the budget controls already
     * enforced by the backend.
     */
    private void migrateCostUsageEventsTable() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS cost_usage_events (
                  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                  user_id uuid NOT NULL,
                  event_type text NOT NULL,
                  quantity integer NOT NULL,
                  estimated_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
                  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
                  occurred_at timestamp NOT NULL DEFAULT now()
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_cost_usage_events_user_time
                  ON cost_usage_events (user_id, occurred_at DESC)
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_cost_usage_events_user_type
                  ON cost_usage_events (user_id, event_type)
                """);

        log.info("Cost usage telemetry table verified");
    }
}
