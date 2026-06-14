package com.nib.backend.service;

import com.nib.backend.model.User;
import com.nib.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates account deletion: stops billing and locks the account synchronously
 * (so the caller gets immediate confirmation), then hands off the heavy data purge
 * to a background worker.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final StripeService stripeService;
    private final AccountDeletionRunner deletionRunner;

    /**
     * Confirms-and-schedules deletion. Returns as soon as the account is disabled and
     * the purge is queued; the actual data erasure happens asynchronously.
     */
    public void requestDeletion(User principal) {
        UUID userId = principal.getId();

        userRepository.findById(userId).ifPresent(user -> {
            // 1. Stop billing right away (best-effort).
            if (user.getStripeSubscriptionId() != null) {
                stripeService.cancelSubscriptionImmediately(user.getStripeSubscriptionId());
            }
            // 2. Lock the account out immediately and mark it for deletion. The marker
            //    survives until the purge succeeds, so a failed purge is retryable.
            user.setEmailVerified(false);
            user.setDeletionRequestedAt(Instant.now());
            userRepository.save(user);
        });

        // 3. Erase all data in the background (runs after the save above has committed).
        deletionRunner.purge(userId);
        log.info("Account deletion scheduled for user {}", userId);
    }

    /**
     * Re-runs the purge for every account still marked for deletion (i.e. a previous
     * purge never finished). Called by the scheduled sweep and the admin endpoint.
     *
     * @return the number of accounts re-queued for purge
     */
    public int retryPendingDeletions() {
        List<User> pending = userRepository.findByDeletionRequestedAtIsNotNull();
        if (!pending.isEmpty()) {
            log.info("Re-queuing purge for {} pending account deletion(s)", pending.size());
        }
        pending.forEach(user -> deletionRunner.purge(user.getId()));
        return pending.size();
    }
}
