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
                  ADD COLUMN IF NOT EXISTS pages_failed integer NOT NULL DEFAULT 0
                """);

        jdbcTemplate.execute("""
                ALTER TABLE ingestion_jobs
                  ADD COLUMN IF NOT EXISTS warning_message text
                """);

        log.info("Partial-ingestion warning columns verified on ingestion_jobs");
    }
}
