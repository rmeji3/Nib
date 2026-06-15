package com.nib.backend.service;

import com.nib.backend.model.ProcessedStripeEvent;
import com.nib.backend.model.User;
import com.nib.backend.repository.ProcessedStripeEventRepository;
import com.nib.backend.repository.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    private final UserRepository userRepository;
    private final ProcessedStripeEventRepository processedEventRepository;

    @Value("${stripe.secret-key:sk_test_mock}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:whsec_mock}")
    private String stripeWebhookSecret;

    /** The single source of truth for which price grants the Pro tier. Never trust a price id from the client. */
    @Value("${stripe.price.pro}")
    private String proPriceId;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    /**
     * Create a Stripe Checkout session for the Pro plan. The price is fixed server-side
     * ({@code stripe.price.pro}) — the client cannot choose what it pays for.
     */
    public String createCheckoutSession(User user) throws StripeException {
        // Prevent double subscription
        if ("PRO".equalsIgnoreCase(user.getSubscriptionTier()) && user.getStripeSubscriptionId() != null) {
            throw new IllegalStateException("User already has an active Pro subscription.");
        }

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setSuccessUrl(frontendUrl + "/settings/pricing/success?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(frontendUrl + "/settings/pricing")
                .setCustomerEmail(user.getEmail()) // Pre-fill email
                .setClientReferenceId(user.getId().toString()) // Tie session back to our User ID
                .setAllowPromotionCodes(true) // Let users (and us, for testing) apply Stripe promo codes
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setPrice(proPriceId)
                                .setQuantity(1L)
                                .build()
                )
                .build();

        // Idempotency is typically handled by passing an Idempotency-Key header or RequestOptions
        // But the Stripe Java library for Session.create doesn't strictly require it for new sessions unless retrying.
        Session session = Session.create(params);
        return session.getUrl();
    }

    /**
     * Cancel the user's Stripe subscription at the end of the current billing period.
     * The user keeps PRO access until that date, then the webhook flips them to FREE.
     *
     * @return the Unix epoch second when PRO access will end
     */
    @Transactional
    public long cancelSubscription(User user) throws StripeException {
        if (!"PRO".equalsIgnoreCase(user.getSubscriptionTier())) {
            throw new IllegalStateException("User does not have an active Pro subscription to cancel.");
        }

        // No Stripe subscription ID — tier was set manually (e.g. via DB or test).
        // Just downgrade immediately without touching Stripe.
        if (user.getStripeSubscriptionId() == null) {
            log.warn("User {} has PRO tier but no Stripe subscription ID — downgrading immediately", user.getId());
            user.setSubscriptionTier("FREE");
            user.setSubscriptionPeriodEnd(null);
            userRepository.save(user);
            return 0L;
        }

        // Cancel at period end so the user keeps access until their next renewal date
        Subscription subscription = Subscription.retrieve(user.getStripeSubscriptionId());
        Subscription updated = subscription.update(
                SubscriptionUpdateParams.builder()
                        .setCancelAtPeriodEnd(true)
                        .build()
        );

        // Store the period end so the frontend can display it
        java.time.Instant periodEnd = java.time.Instant.ofEpochSecond(updated.getCurrentPeriodEnd());
        user.setSubscriptionPeriodEnd(periodEnd);
        user.setSubscriptionCancelAtPeriodEnd(true);
        userRepository.save(user);
        log.info("Scheduled cancellation for user {} at {}", user.getId(), periodEnd);

        return updated.getCurrentPeriodEnd();
    }

    /**
     * Undo a scheduled cancellation: the user is still PRO and within their paid period,
     * so we just clear {@code cancel_at_period_end} on Stripe and the subscription renews
     * normally again.
     *
     * @return the Unix epoch second when the (now renewing) period ends
     */
    @Transactional
    public long resumeSubscription(User user) throws StripeException {
        if (!"PRO".equalsIgnoreCase(user.getSubscriptionTier()) || user.getStripeSubscriptionId() == null) {
            throw new IllegalStateException("No resumable Pro subscription found.");
        }
        if (!user.isSubscriptionCancelAtPeriodEnd()) {
            throw new IllegalStateException("Subscription is not scheduled for cancellation.");
        }

        Subscription subscription = Subscription.retrieve(user.getStripeSubscriptionId());
        Subscription updated = subscription.update(
                SubscriptionUpdateParams.builder()
                        .setCancelAtPeriodEnd(false)
                        .build()
        );

        user.setSubscriptionCancelAtPeriodEnd(false);
        if (updated.getCurrentPeriodEnd() != null) {
            user.setSubscriptionPeriodEnd(java.time.Instant.ofEpochSecond(updated.getCurrentPeriodEnd()));
        }
        userRepository.save(user);
        log.info("Resumed subscription for user {}", user.getId());

        return updated.getCurrentPeriodEnd() != null ? updated.getCurrentPeriodEnd() : 0L;
    }

    /**
     * Cancels a subscription immediately (used for account deletion). Best-effort —
     * we never want a Stripe hiccup to block the user from deleting their account.
     */
    public void cancelSubscriptionImmediately(String subscriptionId) {
        if (subscriptionId == null) return;
        try {
            Subscription.retrieve(subscriptionId).cancel();
            log.info("Immediately canceled Stripe subscription {}", subscriptionId);
        } catch (Exception e) {
            log.warn("Failed to immediately cancel Stripe subscription {}: {}", subscriptionId, e.getMessage());
        }
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) {
        Event event = null;

        try {
            event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Stripe webhook signature verification failed", e);
            throw new IllegalArgumentException("Invalid signature");
        }

        // Idempotency: Stripe delivers events at-least-once and retries on failure.
        // Skip events we've already fully processed so re-deliveries are no-ops.
        if (processedEventRepository.existsById(event.getId())) {
            log.info("Skipping already-processed Stripe event {}", event.getId());
            return;
        }

        // getObject() returns empty when the event's Stripe API version differs from the
        // one pinned by stripe-java. Fall back to deserializeUnsafe() so version skew
        // between the Stripe CLI/account and the SDK doesn't silently drop the event.
        com.stripe.model.EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        StripeObject stripeObject = deserializer.getObject().orElse(null);
        if (stripeObject == null) {
            try {
                stripeObject = deserializer.deserializeUnsafe();
            } catch (com.stripe.exception.EventDataObjectDeserializationException e) {
                log.error("Failed to deserialize Stripe event {} (type {}): {}",
                        event.getId(), event.getType(), e.getMessage());
                return;
            }
        }

        switch (event.getType()) {
            case "checkout.session.completed":
                if (stripeObject instanceof Session) {
                    handleCheckoutSessionCompleted((Session) stripeObject);
                }
                break;
            case "customer.subscription.updated":
                if (stripeObject instanceof Subscription) {
                    handleSubscriptionUpdated((Subscription) stripeObject);
                }
                break;
            case "invoice.payment_failed":
                if (stripeObject instanceof com.stripe.model.Invoice) {
                    handleInvoicePaymentFailed((com.stripe.model.Invoice) stripeObject);
                }
                break;
            case "customer.subscription.deleted":
                if (stripeObject instanceof Subscription) {
                    handleSubscriptionDeleted((Subscription) stripeObject);
                }
                break;
            default:
                log.debug("Unhandled event type: {}", event.getType());
        }

        // Record the event only after handling succeeded. If a handler throws, the
        // surrounding @Transactional rolls back this insert too, so Stripe's retry
        // gets a fresh attempt rather than being silently swallowed.
        processedEventRepository.save(new ProcessedStripeEvent(event.getId(), event.getType()));
    }

    private void handleCheckoutSessionCompleted(Session session) {
        String userIdStr = session.getClientReferenceId();
        if (userIdStr == null) {
            log.warn("No client_reference_id in session {}", session.getId());
            return;
        }

        userRepository.findById(java.util.UUID.fromString(userIdStr)).ifPresent(user -> {
            user.setSubscriptionTier("PRO");
            user.setStripeCustomerId(session.getCustomer());
            user.setStripeSubscriptionId(session.getSubscription());
            user.setSubscriptionPeriodEnd(fetchCurrentPeriodEnd(session.getSubscription()));
            user.setSubscriptionCancelAtPeriodEnd(false); // fresh purchase renews
            userRepository.save(user);
            log.info("Upgraded user {} to PRO tier", user.getId());
        });
    }

    /**
     * Handles status changes on a subscription (renewal, cancellation scheduling, lapse).
     * Active/trialing/past_due keep PRO (past_due is Stripe's grace window); anything else
     * (canceled, unpaid, incomplete_expired) downgrades to FREE.
     */
    private void handleSubscriptionUpdated(Subscription sub) {
        String customerId = sub.getCustomer();
        if (customerId == null) return;

        userRepository.findByStripeCustomerId(customerId).ifPresent(user -> {
            String status = sub.getStatus();
            boolean stillEntitled = "active".equals(status)
                    || "trialing".equals(status)
                    || "past_due".equals(status);

            if (stillEntitled) {
                user.setSubscriptionTier("PRO");
                user.setStripeSubscriptionId(sub.getId());
                user.setSubscriptionCancelAtPeriodEnd(Boolean.TRUE.equals(sub.getCancelAtPeriodEnd()));
                if (sub.getCurrentPeriodEnd() != null) {
                    user.setSubscriptionPeriodEnd(java.time.Instant.ofEpochSecond(sub.getCurrentPeriodEnd()));
                }
                log.info("Subscription updated for user {} — status {}, cancelAtPeriodEnd {}",
                        user.getId(), status, user.isSubscriptionCancelAtPeriodEnd());
            } else {
                user.setSubscriptionTier("FREE");
                user.setStripeSubscriptionId(null);
                user.setSubscriptionPeriodEnd(null);
                user.setSubscriptionCancelAtPeriodEnd(false);
                log.info("Downgraded user {} to FREE — subscription status {}", user.getId(), status);
            }
            userRepository.save(user);
        });
    }

    private void handleInvoicePaymentFailed(com.stripe.model.Invoice invoice) {
        String customerId = invoice.getCustomer();
        if (customerId == null) return;
        // Don't downgrade here — Stripe retries and may recover. We just record it.
        // The eventual customer.subscription.updated/deleted event drives the downgrade.
        userRepository.findByStripeCustomerId(customerId).ifPresent(user ->
                log.warn("Invoice payment failed for user {} (invoice {})", user.getId(), invoice.getId()));
    }

    private void handleSubscriptionDeleted(Subscription sub) {
        String customerId = sub.getCustomer();
        if (customerId == null) {
            log.warn("No customer ID in subscription deleted event");
            return;
        }

        userRepository.findByStripeCustomerId(customerId).ifPresent(user -> {
            user.setSubscriptionTier("FREE");
            user.setStripeSubscriptionId(null);
            user.setSubscriptionPeriodEnd(null);
            user.setSubscriptionCancelAtPeriodEnd(false);
            userRepository.save(user);
            log.info("Downgraded user {} to FREE tier after subscription deletion", user.getId());
        });
    }

    /** Best-effort lookup of the subscription's current period end; null if unavailable. */
    private java.time.Instant fetchCurrentPeriodEnd(String subscriptionId) {
        if (subscriptionId == null) return null;
        try {
            Subscription sub = Subscription.retrieve(subscriptionId);
            return sub.getCurrentPeriodEnd() != null
                    ? java.time.Instant.ofEpochSecond(sub.getCurrentPeriodEnd())
                    : null;
        } catch (StripeException e) {
            log.warn("Could not retrieve subscription {} for period end: {}", subscriptionId, e.getMessage());
            return null;
        }
    }
}
