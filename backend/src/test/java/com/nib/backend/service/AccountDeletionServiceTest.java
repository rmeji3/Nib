package com.nib.backend.service;

import com.nib.backend.model.User;
import com.nib.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountDeletionServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final StripeService stripeService = mock(StripeService.class);
    private final AccountDeletionRunner runner = mock(AccountDeletionRunner.class);
    private final AccountDeletionService service =
            new AccountDeletionService(userRepository, stripeService, runner);

    @Test
    void requestDeletionLocksAccountMarksItCancelsStripeAndQueuesPurge() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setEmailVerified(true);
        user.setStripeSubscriptionId("sub_123");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        User principal = new User();
        principal.setId(id);

        service.requestDeletion(principal);

        assertThat(user.isEmailVerified()).isFalse();           // locked out
        assertThat(user.getDeletionRequestedAt()).isNotNull();  // marked for purge
        verify(stripeService).cancelSubscriptionImmediately("sub_123");
        verify(userRepository).save(user);
        verify(runner).purge(id);
    }

    @Test
    void requestDeletionSkipsStripeWhenNoSubscription() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        User principal = new User();
        principal.setId(id);

        service.requestDeletion(principal);

        verify(stripeService, never()).cancelSubscriptionImmediately(org.mockito.ArgumentMatchers.any());
        verify(runner).purge(id);
    }

    @Test
    void retryPendingDeletionsRequeuesEveryMarkedAccount() {
        User a = new User();
        a.setId(UUID.randomUUID());
        User b = new User();
        b.setId(UUID.randomUUID());
        when(userRepository.findByDeletionRequestedAtIsNotNull()).thenReturn(List.of(a, b));

        int count = service.retryPendingDeletions();

        assertThat(count).isEqualTo(2);
        verify(runner).purge(a.getId());
        verify(runner).purge(b.getId());
        verify(runner, times(2)).purge(org.mockito.ArgumentMatchers.any());
    }
}
