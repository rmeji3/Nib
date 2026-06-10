package com.nib.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.config.CostTelemetryProperties;
import com.nib.backend.dto.CostDashboardResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CostTelemetryService {

    public static final String PAGES_INGESTED = "pages_ingested";
    public static final String VISION_CALL = "vision_call";
    public static final String EMBEDDING_BATCH = "embedding_batch";
    public static final String CHAT_CALL = "chat_call";
    public static final String RATE_LIMIT_HIT = "rate_limit_hit";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final CostTelemetryProperties properties;

    @Transactional
    public void record(UUID userId, String eventType, int quantity, Map<String, ?> metadata) {
        if (!properties.isEnabled() || userId == null || quantity <= 0) {
            return;
        }
        jdbcTemplate.update(
                """
                INSERT INTO cost_usage_events (
                  id, user_id, event_type, quantity, estimated_cost_usd, metadata
                )
                VALUES (gen_random_uuid(), ?, ?, ?, ?, ?::jsonb)
                """,
                userId,
                eventType,
                quantity,
                estimate(eventType, quantity),
                toJson(metadata)
        );
    }

    @Transactional(readOnly = true)
    public CostDashboardResponse getDashboard(UUID userId) {
        CostDashboardResponse.Totals eventTotals = queryEventTotals(userId);
        TokenTotals tokenTotals = queryTokenTotals(userId);
        BigDecimal tokenCost = estimateTokenCost(tokenTotals.promptTokens(), tokenTotals.completionTokens());

        CostDashboardResponse.Totals totals = new CostDashboardResponse.Totals(
                eventTotals.pagesIngested(),
                eventTotals.visionCalls(),
                eventTotals.embeddingBatches(),
                eventTotals.chatCalls(),
                tokenTotals.promptTokens(),
                tokenTotals.completionTokens(),
                tokenTotals.totalTokens(),
                eventTotals.rateLimitHits(),
                eventTotals.estimatedCostUsd().add(tokenCost)
        );

        return new CostDashboardResponse(
                totals,
                queryDailyUsage(userId),
                queryRecentEvents(userId)
        );
    }

    private CostDashboardResponse.Totals queryEventTotals(UUID userId) {
        return jdbcTemplate.queryForObject(
                """
                SELECT
                  coalesce(sum(quantity) FILTER (WHERE event_type = 'pages_ingested'), 0)::int AS pages_ingested,
                  coalesce(sum(quantity) FILTER (WHERE event_type = 'vision_call'), 0)::int AS vision_calls,
                  coalesce(sum(quantity) FILTER (WHERE event_type = 'embedding_batch'), 0)::int AS embedding_batches,
                  coalesce(sum(quantity) FILTER (WHERE event_type = 'chat_call'), 0)::int AS chat_calls,
                  coalesce(sum(quantity) FILTER (WHERE event_type = 'rate_limit_hit'), 0)::int AS rate_limit_hits,
                  coalesce(sum(estimated_cost_usd), 0)::numeric AS estimated_cost_usd
                FROM cost_usage_events
                WHERE user_id = ?
                """,
                (rs, rowNum) -> new CostDashboardResponse.Totals(
                        rs.getInt("pages_ingested"),
                        rs.getInt("vision_calls"),
                        rs.getInt("embedding_batches"),
                        rs.getInt("chat_calls"),
                        0,
                        0,
                        0,
                        rs.getInt("rate_limit_hits"),
                        rs.getBigDecimal("estimated_cost_usd")
                ),
                userId
        );
    }

    private TokenTotals queryTokenTotals(UUID userId) {
        return jdbcTemplate.queryForObject(
                """
                SELECT
                  coalesce(sum(prompt_token_count), 0)::int AS prompt_tokens,
                  coalesce(sum(candidates_token_count), 0)::int AS completion_tokens,
                  coalesce(sum(total_token_count), 0)::int AS total_tokens
                FROM answer_audits
                WHERE user_id = ?
                """,
                (rs, rowNum) -> new TokenTotals(
                        rs.getInt("prompt_tokens"),
                        rs.getInt("completion_tokens"),
                        rs.getInt("total_tokens")
                ),
                userId
        );
    }

    private List<CostDashboardResponse.DailyUsage> queryDailyUsage(UUID userId) {
        return jdbcTemplate.query(
                """
                WITH event_days AS (
                  SELECT
                    occurred_at::date AS day,
                    coalesce(sum(quantity) FILTER (WHERE event_type = 'pages_ingested'), 0)::int AS pages_ingested,
                    coalesce(sum(quantity) FILTER (WHERE event_type = 'vision_call'), 0)::int AS vision_calls,
                    coalesce(sum(quantity) FILTER (WHERE event_type = 'embedding_batch'), 0)::int AS embedding_batches,
                    coalesce(sum(quantity) FILTER (WHERE event_type = 'chat_call'), 0)::int AS chat_calls,
                    coalesce(sum(quantity) FILTER (WHERE event_type = 'rate_limit_hit'), 0)::int AS rate_limit_hits,
                    coalesce(sum(estimated_cost_usd), 0)::numeric AS estimated_cost_usd
                  FROM cost_usage_events
                  WHERE user_id = ?
                    AND occurred_at >= now() - interval '30 days'
                  GROUP BY day
                ),
                token_days AS (
                  SELECT
                    created_at::date AS day,
                    coalesce(sum(total_token_count), 0)::int AS total_tokens
                  FROM answer_audits
                  WHERE user_id = ?
                    AND created_at >= now() - interval '30 days'
                  GROUP BY day
                )
                SELECT
                  coalesce(e.day, t.day) AS day,
                  coalesce(e.pages_ingested, 0) AS pages_ingested,
                  coalesce(e.vision_calls, 0) AS vision_calls,
                  coalesce(e.embedding_batches, 0) AS embedding_batches,
                  coalesce(e.chat_calls, 0) AS chat_calls,
                  coalesce(t.total_tokens, 0) AS total_tokens,
                  coalesce(e.rate_limit_hits, 0) AS rate_limit_hits,
                  coalesce(e.estimated_cost_usd, 0)::numeric AS estimated_cost_usd
                FROM event_days e
                FULL OUTER JOIN token_days t ON t.day = e.day
                ORDER BY day ASC
                """,
                (rs, rowNum) -> new CostDashboardResponse.DailyUsage(
                        rs.getObject("day", LocalDate.class).toString(),
                        rs.getInt("pages_ingested"),
                        rs.getInt("vision_calls"),
                        rs.getInt("embedding_batches"),
                        rs.getInt("chat_calls"),
                        rs.getInt("total_tokens"),
                        rs.getInt("rate_limit_hits"),
                        rs.getBigDecimal("estimated_cost_usd")
                ),
                userId,
                userId
        );
    }

    private List<CostDashboardResponse.RecentEvent> queryRecentEvents(UUID userId) {
        return jdbcTemplate.query(
                """
                SELECT occurred_at, event_type, quantity, estimated_cost_usd, metadata::text AS metadata
                FROM cost_usage_events
                WHERE user_id = ?
                ORDER BY occurred_at DESC
                LIMIT 20
                """,
                this::mapRecentEvent,
                userId
        );
    }

    private CostDashboardResponse.RecentEvent mapRecentEvent(ResultSet rs, int rowNum) throws SQLException {
        return new CostDashboardResponse.RecentEvent(
                rs.getTimestamp("occurred_at").toLocalDateTime().toString(),
                rs.getString("event_type"),
                rs.getInt("quantity"),
                rs.getBigDecimal("estimated_cost_usd"),
                rs.getString("metadata")
        );
    }

    private BigDecimal estimate(String eventType, int quantity) {
        var estimates = properties.getEstimates();
        BigDecimal unit = switch (eventType) {
            case PAGES_INGESTED -> estimates.getPageIngestedUsd();
            case VISION_CALL -> estimates.getVisionCallUsd();
            case EMBEDDING_BATCH -> estimates.getEmbeddingBatchUsd();
            case CHAT_CALL -> estimates.getChatCallUsd();
            case RATE_LIMIT_HIT -> estimates.getRateLimitHitUsd();
            default -> BigDecimal.ZERO;
        };
        return unit.multiply(BigDecimal.valueOf(quantity));
    }

    private BigDecimal estimateTokenCost(int promptTokens, int completionTokens) {
        // Token costs vary by provider/model and change over time. Keep the durable
        // dashboard truthful by surfacing token counts; provider-specific token
        // cost conversion can be configured later without rewriting stored events.
        return BigDecimal.ZERO;
    }

    private String toJson(Map<String, ?> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata == null ? Map.of() : metadata);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize cost telemetry metadata: {}", ex.getMessage());
            return "{}";
        }
    }

    private record TokenTotals(int promptTokens, int completionTokens, int totalTokens) {}
}
