package com.nib.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@ConfigurationProperties(prefix = "cost-telemetry")
@Getter
@Setter
public class CostTelemetryProperties {

    private boolean enabled = true;
    private final Estimates estimates = new Estimates();

    @Getter
    @Setter
    public static class Estimates {
        private BigDecimal pageIngestedUsd = new BigDecimal("0.00005");
        private BigDecimal visionCallUsd = new BigDecimal("0.00020");
        private BigDecimal embeddingBatchUsd = new BigDecimal("0.00010");
        private BigDecimal chatCallUsd = new BigDecimal("0.00020");
        private BigDecimal rateLimitHitUsd = BigDecimal.ZERO;
    }
}
