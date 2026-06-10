package com.nib.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "answer_audits")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_message_id", nullable = false)
    private UUID userMessageId;

    @Column(name = "assistant_message_id", nullable = false)
    private UUID assistantMessageId;

    @Column(name = "prompt_version", nullable = false)
    private String promptVersion;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "retrieved_block_ids", nullable = false, columnDefinition = "jsonb")
    private String retrievedBlockIds;

    @Column(nullable = false)
    private Double confidence;

    @Column(nullable = false)
    private Double groundedness;

    @Column(name = "latency_ms", nullable = false)
    private Long latencyMs;

    @Column(name = "prompt_token_count")
    private Integer promptTokenCount;

    @Column(name = "candidates_token_count")
    private Integer candidatesTokenCount;

    @Column(name = "total_token_count")
    private Integer totalTokenCount;

    @Column(nullable = false)
    private Boolean refused;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
