package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.dto.CitationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticCacheService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public record AnswerCacheHit(
            UUID id,
            String answer,
            List<CitationDto> citations,
            List<UUID> retrievedBlockIds,
            double confidence,
            double groundedness,
            double distance
    ) {}

    public Optional<float[]> findEmbedding(String inputText, String modelVersion) {
        String normalized = normalize(inputText);
        String inputHash = sha256(normalized);
        List<float[]> hits = jdbcTemplate.query(
                """
                SELECT embedding::text AS embedding
                FROM embedding_cache
                WHERE input_hash = ?
                  AND model_version = ?
                LIMIT 1
                """,
                (rs, rowNum) -> parseVector(rs.getString("embedding")),
                inputHash,
                modelVersion
        );
        if (hits.isEmpty()) {
            return Optional.empty();
        }
        jdbcTemplate.update(
                """
                UPDATE embedding_cache
                SET last_accessed_at = now(),
                    access_count = access_count + 1
                WHERE input_hash = ?
                  AND model_version = ?
                """,
                inputHash,
                modelVersion
        );
        return Optional.of(hits.get(0));
    }

    public void saveEmbedding(String inputText, String modelVersion, float[] embedding) {
        String normalized = normalize(inputText);
        String inputHash = sha256(normalized);
        jdbcTemplate.update(
                """
                INSERT INTO embedding_cache (id, input_hash, input_text, model_version, embedding)
                VALUES (gen_random_uuid(), ?, ?, ?, ?::vector)
                ON CONFLICT (input_hash, model_version)
                DO UPDATE SET
                  embedding = EXCLUDED.embedding,
                  input_text = EXCLUDED.input_text,
                  last_accessed_at = now(),
                  access_count = embedding_cache.access_count + 1
                """,
                inputHash,
                normalized,
                modelVersion,
                EmbeddingService.toVectorString(embedding)
        );
    }

    public Optional<AnswerCacheHit> findAnswer(
            UUID documentId,
            UUID documentVersionId,
            float[] queryEmbedding,
            String promptVersion,
            String modelVersion,
            double maxDistance
    ) {
        String vector = EmbeddingService.toVectorString(queryEmbedding);
        List<AnswerCacheHit> hits = jdbcTemplate.query(
                """
                SELECT id,
                       answer,
                       citations::text AS citations,
                       retrieved_block_ids::text AS retrieved_block_ids,
                       confidence,
                       groundedness,
                       distance
                FROM (
                  SELECT id,
                         answer,
                         citations,
                         retrieved_block_ids,
                         confidence,
                         groundedness,
                         query_embedding <=> ?::vector AS distance
                  FROM answer_cache
                  WHERE document_id = ?
                    AND document_version_id = ?
                    AND prompt_version = ?
                    AND model_version = ?
                ) ranked
                WHERE distance <= ?
                ORDER BY distance ASC
                LIMIT 1
                """,
                (rs, rowNum) -> new AnswerCacheHit(
                        rs.getObject("id", UUID.class),
                        rs.getString("answer"),
                        readCitations(rs.getString("citations")),
                        readUuidList(rs.getString("retrieved_block_ids")),
                        rs.getDouble("confidence"),
                        rs.getDouble("groundedness"),
                        rs.getDouble("distance")
                ),
                vector,
                documentId,
                documentVersionId,
                promptVersion,
                modelVersion,
                maxDistance
        );
        if (hits.isEmpty()) {
            return Optional.empty();
        }
        jdbcTemplate.update(
                """
                UPDATE answer_cache
                SET last_accessed_at = now(),
                    access_count = access_count + 1
                WHERE id = ?
                """,
                hits.get(0).id()
        );
        return Optional.of(hits.get(0));
    }

    public void saveAnswer(
            UUID documentId,
            UUID documentVersionId,
            String queryText,
            float[] queryEmbedding,
            String promptVersion,
            String modelVersion,
            String answer,
            List<CitationDto> citations,
            List<UUID> retrievedBlockIds,
            double confidence,
            double groundedness
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO answer_cache (
                  id,
                  document_id,
                  document_version_id,
                  query_text,
                  query_embedding,
                  prompt_version,
                  model_version,
                  answer,
                  citations,
                  retrieved_block_ids,
                  confidence,
                  groundedness
                )
                VALUES (
                  gen_random_uuid(), ?, ?, ?, ?::vector, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?
                )
                """,
                documentId,
                documentVersionId,
                normalize(queryText),
                EmbeddingService.toVectorString(queryEmbedding),
                promptVersion,
                modelVersion,
                answer,
                writeJson(citations),
                writeJson(retrievedBlockIds),
                confidence,
                groundedness
        );
    }

    public int evictAnswersForDocument(UUID documentId) {
        int deleted = jdbcTemplate.update("DELETE FROM answer_cache WHERE document_id = ?", documentId);
        if (deleted > 0) {
            log.info("Evicted {} semantic answer cache entries for document {}", deleted, documentId);
        }
        return deleted;
    }

    public static String normalize(String input) {
        if (input == null) {
            return "";
        }
        return input.trim().replaceAll("\\s+", " ").toLowerCase();
    }

    private List<CitationDto> readCitations(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException ex) {
            throw new RuntimeException("Failed to deserialize cached citations", ex);
        }
    }

    private List<UUID> readUuidList(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException ex) {
            throw new RuntimeException("Failed to deserialize cached block ids", ex);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new RuntimeException("Failed to serialize semantic cache value", ex);
        }
    }

    private static float[] parseVector(String vector) {
        String trimmed = vector.trim();
        if (trimmed.length() < 2) {
            return new float[0];
        }
        String body = trimmed.substring(1, trimmed.length() - 1);
        if (body.isBlank()) {
            return new float[0];
        }
        String[] parts = body.split(",");
        float[] result = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Float.parseFloat(parts[i]);
        }
        return result;
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
