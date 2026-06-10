package com.nib.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "cost-controls")
@Getter
@Setter
public class CostControlProperties {

    private boolean enabled = true;
    private final Api api = new Api();
    private final Chat chat = new Chat();
    private final Ingestion ingestion = new Ingestion();

    @Getter
    @Setter
    public static class Api {
        private boolean enabled = true;
        private int maxRequestsPerWindow = 120;
        private long windowSeconds = 60;
    }

    @Getter
    @Setter
    public static class Chat {
        private boolean enabled = true;
        private int maxRequestsPerWindow = 20;
        private long windowSeconds = 60;
    }

    @Getter
    @Setter
    public static class Ingestion {
        private boolean enabled = true;
        private int maxTriggersPerWindow = 5;
        private long windowSeconds = 3600;
        private int maxConcurrentJobsPerUser = 2;
        private int maxPagesPerDocument = 250;
    }
}
