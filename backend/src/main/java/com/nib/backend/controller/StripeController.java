package com.nib.backend.controller;

import com.nib.backend.model.User;
import com.nib.backend.service.StripeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/stripe")
@RequiredArgsConstructor
public class StripeController {

    private final StripeService stripeService;

    @PostMapping("/create-checkout-session")
    public ResponseEntity<Map<String, String>> createCheckoutSession(
            @AuthenticationPrincipal User user) {

        try {
            if ("PRO".equals(user.getSubscriptionTier())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "You are already subscribed to the Pro tier."));
            }

            // The price is fixed server-side — the client does not choose what it pays for.
            String url = stripeService.createCheckoutSession(user);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            log.error("Failed to create checkout session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cancel-subscription")
    public ResponseEntity<Map<String, Object>> cancelSubscription(
            @AuthenticationPrincipal User user) {

        try {
            long periodEnd = stripeService.cancelSubscription(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Subscription scheduled for cancellation.",
                    "periodEnd", periodEnd
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to cancel subscription for user {}", user.getId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/resume-subscription")
    public ResponseEntity<Map<String, Object>> resumeSubscription(
            @AuthenticationPrincipal User user) {

        try {
            long periodEnd = stripeService.resumeSubscription(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Subscription resumed.",
                    "periodEnd", periodEnd
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to resume subscription for user {}", user.getId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        
        try {
            stripeService.handleWebhook(payload, sigHeader);
            return ResponseEntity.ok("Success");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // A concurrent re-delivery of the same event lost the race to insert its
            // processed-events marker (PK violation). The other thread already handled
            // it, so this is an idempotent success — tell Stripe to stop retrying.
            log.info("Duplicate Stripe event delivery ignored (already processed)");
            return ResponseEntity.ok("Success (duplicate)");
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook");
        }
    }
}
