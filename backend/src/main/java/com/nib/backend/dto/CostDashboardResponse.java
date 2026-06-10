package com.nib.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record CostDashboardResponse(
        Totals totals,
        List<DailyUsage> dailyUsage,
        List<RecentEvent> recentEvents
) {
    public record Totals(
            int pagesIngested,
            int visionCalls,
            int embeddingBatches,
            int chatCalls,
            int promptTokens,
            int completionTokens,
            int totalTokens,
            int rateLimitHits,
            BigDecimal estimatedCostUsd
    ) {}

    public record DailyUsage(
            String date,
            int pagesIngested,
            int visionCalls,
            int embeddingBatches,
            int chatCalls,
            int totalTokens,
            int rateLimitHits,
            BigDecimal estimatedCostUsd
    ) {}

    public record RecentEvent(
            String occurredAt,
            String eventType,
            int quantity,
            BigDecimal estimatedCostUsd,
            String metadata
    ) {}
}
