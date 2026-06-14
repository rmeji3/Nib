package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Background worker that permanently erases every trace of a user's data.
 * Separate component so {@code @Async} runs through Spring's proxy (a self-invoked
 * async method would otherwise execute synchronously).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccountDeletionRunner {

    private final JdbcTemplate jdbcTemplate;
    private final SupabaseStorageService storageService;

    private static final int MAX_ATTEMPTS = 3;

    /** Async entry point — retries a few times before giving up (the row stays marked for later). */
    @Async("deletionExecutor")
    public void purge(UUID userId) {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                purgeOnce(userId);
                return; // success — the user row (and its deletion marker) is gone
            } catch (Exception e) {
                log.error("Data purge attempt {}/{} failed for user {}: {}",
                        attempt, MAX_ATTEMPTS, userId, e.getMessage());
                if (attempt < MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(attempt * 2000L); // simple linear backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
            }
        }
        log.error("Data purge exhausted retries for user {} — left marked for scheduled/admin retry", userId);
    }

    /** Performs one full purge attempt. Throws on failure so the caller can retry. */
    public void purgeOnce(UUID userId) {
        log.info("Starting data purge for user {}", userId);
        {
            // Capture storage paths before the document rows disappear.
            List<String> storagePaths = jdbcTemplate.queryForList(
                    "SELECT storage_path FROM documents WHERE user_id = ?", String.class, userId);

            // ── Delete DB rows, children before parents ──────────────────────
            // Document-scoped descendants
            jdbcTemplate.update(
                    "DELETE FROM embeddings WHERE block_id IN " +
                    "(SELECT id FROM content_blocks WHERE document_id IN " +
                    "(SELECT id FROM documents WHERE user_id = ?))", userId);
            jdbcTemplate.update(
                    "DELETE FROM answer_cache WHERE document_id IN " +
                    "(SELECT id FROM documents WHERE user_id = ?)", userId);
            jdbcTemplate.update(
                    "DELETE FROM content_blocks WHERE document_id IN " +
                    "(SELECT id FROM documents WHERE user_id = ?)", userId);
            jdbcTemplate.update(
                    "DELETE FROM ingestion_jobs WHERE document_id IN " +
                    "(SELECT id FROM documents WHERE user_id = ?)", userId);
            jdbcTemplate.update(
                    "DELETE FROM collection_documents WHERE document_id IN " +
                    "(SELECT id FROM documents WHERE user_id = ?) " +
                    "OR collection_id IN (SELECT id FROM collections WHERE user_id = ?)", userId, userId);

            // Chat + telemetry (user-scoped)
            jdbcTemplate.update("DELETE FROM answer_audits WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM chat_message_feedback WHERE user_id = ?", userId);
            jdbcTemplate.update(
                    "DELETE FROM chat_messages WHERE session_id IN " +
                    "(SELECT id FROM chat_sessions WHERE user_id = ?)", userId);
            jdbcTemplate.update("DELETE FROM chat_sessions WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM cost_usage_events WHERE user_id = ?", userId);

            // Parents
            jdbcTemplate.update("DELETE FROM collections WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM documents WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);

            // ── Delete stored files (external, best-effort, after DB is clean) ─
            storageService.deleteFiles(storagePaths);

            log.info("Completed data purge for user {} ({} file(s))", userId, storagePaths.size());
        }
    }
}
