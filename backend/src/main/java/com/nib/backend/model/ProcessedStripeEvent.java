package com.nib.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Records Stripe webhook event ids that have already been processed, so re-delivered
 * events (Stripe is at-least-once) become no-ops. The Stripe event id is the primary key.
 */
@Entity
@Table(name = "processed_stripe_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProcessedStripeEvent {

    @Id
    @Column(name = "event_id", nullable = false, updatable = false)
    private String eventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public ProcessedStripeEvent(String eventId, String eventType) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.processedAt = Instant.now();
    }
}
