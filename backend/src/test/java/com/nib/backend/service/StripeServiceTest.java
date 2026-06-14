package com.nib.backend.service;

import com.nib.backend.model.ProcessedStripeEvent;
import com.nib.backend.model.User;
import com.nib.backend.repository.ProcessedStripeEventRepository;
import com.nib.backend.repository.UserRepository;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StripeServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final ProcessedStripeEventRepository processedEventRepository = mock(ProcessedStripeEventRepository.class);
    private final StripeService service = new StripeService(userRepository, processedEventRepository);

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String CUSTOMER_ID = "cus_123";
    private static final String SUB_ID = "sub_123";
    private static final long PERIOD_END = 1_900_000_000L;

    // ── checkout.session.completed ──────────────────────────────────────────

    @Test
    void checkoutCompletedUpgradesUserToProAndSetsPeriodEnd() throws Exception {
        User user = freeUser();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        Session session = mock(Session.class);
        when(session.getClientReferenceId()).thenReturn(USER_ID.toString());
        when(session.getCustomer()).thenReturn(CUSTOMER_ID);
        when(session.getSubscription()).thenReturn(SUB_ID);

        Subscription retrieved = mock(Subscription.class);
        when(retrieved.getCurrentPeriodEnd()).thenReturn(PERIOD_END);

        Event event = mockEvent("evt_1", "checkout.session.completed", session);

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class);
             MockedStatic<Subscription> subStatic = org.mockito.Mockito.mockStatic(Subscription.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            subStatic.when(() -> Subscription.retrieve(SUB_ID)).thenReturn(retrieved);

            service.handleWebhook("payload", "sig");
        }

        assertThat(user.getSubscriptionTier()).isEqualTo("PRO");
        assertThat(user.getStripeCustomerId()).isEqualTo(CUSTOMER_ID);
        assertThat(user.getStripeSubscriptionId()).isEqualTo(SUB_ID);
        assertThat(user.getSubscriptionPeriodEnd()).isEqualTo(Instant.ofEpochSecond(PERIOD_END));
        verify(userRepository).save(user);
        verify(processedEventRepository).save(any(ProcessedStripeEvent.class));
    }

    // ── API-version skew: getObject() empty → deserializeUnsafe() fallback ──

    @Test
    void usesDeserializeUnsafeWhenTypedObjectMissing() throws Exception {
        User user = freeUser();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        Session session = mock(Session.class);
        when(session.getClientReferenceId()).thenReturn(USER_ID.toString());
        when(session.getCustomer()).thenReturn(CUSTOMER_ID);
        when(session.getSubscription()).thenReturn(null); // period-end fetch skipped

        Event event = mock(Event.class);
        when(event.getId()).thenReturn("evt_skew");
        when(event.getType()).thenReturn("checkout.session.completed");
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.empty());          // version skew
        when(deserializer.deserializeUnsafe()).thenReturn(session);           // fallback wins
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            service.handleWebhook("payload", "sig");
        }

        assertThat(user.getSubscriptionTier()).isEqualTo("PRO");
    }

    // ── customer.subscription.updated ───────────────────────────────────────

    @Test
    void subscriptionUpdatedToCanceledDowngradesToFree() throws Exception {
        User user = proUser();
        when(userRepository.findByStripeCustomerId(CUSTOMER_ID)).thenReturn(Optional.of(user));

        Subscription sub = mock(Subscription.class);
        when(sub.getCustomer()).thenReturn(CUSTOMER_ID);
        when(sub.getStatus()).thenReturn("canceled");

        Event event = mockEvent("evt_upd_cancel", "customer.subscription.updated", sub);

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            service.handleWebhook("payload", "sig");
        }

        assertThat(user.getSubscriptionTier()).isEqualTo("FREE");
        assertThat(user.getStripeSubscriptionId()).isNull();
        assertThat(user.getSubscriptionPeriodEnd()).isNull();
    }

    @Test
    void subscriptionUpdatedActiveKeepsProAndRefreshesPeriodEnd() throws Exception {
        User user = proUser();
        user.setSubscriptionPeriodEnd(null);
        when(userRepository.findByStripeCustomerId(CUSTOMER_ID)).thenReturn(Optional.of(user));

        Subscription sub = mock(Subscription.class);
        when(sub.getCustomer()).thenReturn(CUSTOMER_ID);
        when(sub.getStatus()).thenReturn("active");
        when(sub.getId()).thenReturn(SUB_ID);
        when(sub.getCurrentPeriodEnd()).thenReturn(PERIOD_END);

        Event event = mockEvent("evt_upd_active", "customer.subscription.updated", sub);

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            service.handleWebhook("payload", "sig");
        }

        assertThat(user.getSubscriptionTier()).isEqualTo("PRO");
        assertThat(user.getStripeSubscriptionId()).isEqualTo(SUB_ID);
        assertThat(user.getSubscriptionPeriodEnd()).isEqualTo(Instant.ofEpochSecond(PERIOD_END));
    }

    @Test
    void subscriptionUpdatedReflectsCancelAtPeriodEndFlag() throws Exception {
        User user = proUser();
        user.setSubscriptionCancelAtPeriodEnd(false);
        when(userRepository.findByStripeCustomerId(CUSTOMER_ID)).thenReturn(Optional.of(user));

        Subscription sub = mock(Subscription.class);
        when(sub.getCustomer()).thenReturn(CUSTOMER_ID);
        when(sub.getStatus()).thenReturn("active");
        when(sub.getId()).thenReturn(SUB_ID);
        when(sub.getCurrentPeriodEnd()).thenReturn(PERIOD_END);
        when(sub.getCancelAtPeriodEnd()).thenReturn(true); // user scheduled a cancellation

        Event event = mockEvent("evt_upd_cancelflag", "customer.subscription.updated", sub);

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            service.handleWebhook("payload", "sig");
        }

        assertThat(user.getSubscriptionTier()).isEqualTo("PRO");
        assertThat(user.isSubscriptionCancelAtPeriodEnd()).isTrue();
    }

    // ── resume (undo scheduled cancellation) ────────────────────────────────

    @Test
    void resumeSubscriptionClearsCancelFlag() throws Exception {
        User user = proUser();
        user.setSubscriptionCancelAtPeriodEnd(true);

        Subscription subscription = mock(Subscription.class);
        Subscription updated = mock(Subscription.class);
        when(updated.getCurrentPeriodEnd()).thenReturn(PERIOD_END);
        when(subscription.update(any(com.stripe.param.SubscriptionUpdateParams.class))).thenReturn(updated);

        try (MockedStatic<Subscription> subStatic = org.mockito.Mockito.mockStatic(Subscription.class)) {
            subStatic.when(() -> Subscription.retrieve(SUB_ID)).thenReturn(subscription);
            long end = service.resumeSubscription(user);
            assertThat(end).isEqualTo(PERIOD_END);
        }

        assertThat(user.isSubscriptionCancelAtPeriodEnd()).isFalse();
        assertThat(user.getSubscriptionTier()).isEqualTo("PRO");
        verify(userRepository).save(user);
    }

    // ── invoice.payment_failed does NOT downgrade ──────────────────────────

    @Test
    void invoicePaymentFailedDoesNotDowngrade() throws Exception {
        User user = proUser();
        when(userRepository.findByStripeCustomerId(CUSTOMER_ID)).thenReturn(Optional.of(user));

        Invoice invoice = mock(Invoice.class);
        when(invoice.getCustomer()).thenReturn(CUSTOMER_ID);
        when(invoice.getId()).thenReturn("in_123");

        Event event = mockEvent("evt_fail", "invoice.payment_failed", invoice);

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            service.handleWebhook("payload", "sig");
        }

        assertThat(user.getSubscriptionTier()).isEqualTo("PRO");
        verify(userRepository, never()).save(any());
    }

    // ── idempotency ─────────────────────────────────────────────────────────

    @Test
    void alreadyProcessedEventIsSkipped() throws Exception {
        when(processedEventRepository.existsById("evt_dupe")).thenReturn(true);

        Event event = mock(Event.class);
        when(event.getId()).thenReturn("evt_dupe");

        try (MockedStatic<Webhook> webhook = org.mockito.Mockito.mockStatic(Webhook.class)) {
            webhook.when(() -> Webhook.constructEvent(any(), any(), any())).thenReturn(event);
            service.handleWebhook("payload", "sig");
        }

        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).findByStripeCustomerId(anyString());
        verify(processedEventRepository, never()).save(any());
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Event mockEvent(String id, String type, StripeObject obj) {
        Event event = mock(Event.class);
        when(event.getId()).thenReturn(id);
        when(event.getType()).thenReturn(type);
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(obj));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }

    private User freeUser() {
        User u = new User();
        u.setId(USER_ID);
        u.setEmail("u@example.com");
        u.setSubscriptionTier("FREE");
        return u;
    }

    private User proUser() {
        User u = new User();
        u.setId(USER_ID);
        u.setEmail("u@example.com");
        u.setSubscriptionTier("PRO");
        u.setStripeCustomerId(CUSTOMER_ID);
        u.setStripeSubscriptionId(SUB_ID);
        u.setSubscriptionPeriodEnd(Instant.ofEpochSecond(PERIOD_END));
        return u;
    }
}
