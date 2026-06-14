package com.nib.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically retries account purges that never completed (e.g. the app restarted
 * mid-purge, or all in-job retries failed). Idempotent: re-running a purge on an
 * already-clean user is a no-op.
 */
@Component
@RequiredArgsConstructor
public class AccountDeletionSweep {

    private final AccountDeletionService accountDeletionService;

    // Every 15 minutes, after a 5-minute startup delay.
    @Scheduled(initialDelay = 300_000, fixedDelay = 900_000)
    public void sweep() {
        accountDeletionService.retryPendingDeletions();
    }
}
