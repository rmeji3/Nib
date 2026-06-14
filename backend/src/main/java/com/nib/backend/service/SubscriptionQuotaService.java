package com.nib.backend.service;

import com.nib.backend.exception.QuotaExceededException;
import com.nib.backend.model.User;
import com.nib.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionQuotaService {

    private final UserRepository userRepository;

    // Free Tier Limits
    private static final int FREE_MAX_DOCS = 10;
    private static final int FREE_MAX_PAGES = 150;
    private static final int FREE_MAX_PREMIUM_QUERIES = 0; // Or 15 if you decide to give them some premium queries

    // Pro Tier Limits
    private static final int PRO_MAX_DOCS = 500;
    private static final int PRO_MAX_PAGES = 10000;
    private static final int PRO_MAX_PREMIUM_QUERIES = 250;

    /**
     * Checks if the user is within their ingestion quota before uploading a document.
     * Also resets the quota counters if it's a new calendar month.
     * 
     * @param user User
     * @param pagesToIngest number of pages in the new document
     */
    @Transactional
    public void checkAndRecordIngestionQuota(User detachedUser, int pagesToIngest) {
        // Re-load under a row lock so concurrent uploads for the same user can't both
        // read the old count and each think there's room (read-modify-write race).
        User user = userRepository.findByIdForUpdate(detachedUser.getId())
                .orElseThrow(() -> new IllegalStateException("User not found: " + detachedUser.getId()));
        checkAndResetMonthlyQuota(user);

        boolean isPro = "PRO".equalsIgnoreCase(user.getSubscriptionTier());
        int maxDocs = isPro ? PRO_MAX_DOCS : FREE_MAX_DOCS;
        int maxPages = isPro ? PRO_MAX_PAGES : FREE_MAX_PAGES;

        if (user.getCurrentMonthDocsIngested() >= maxDocs) {
            throw new QuotaExceededException("Monthly document upload limit reached.", "DOCUMENTS", user.getSubscriptionTier());
        }

        if (user.getCurrentMonthPagesIngested() + pagesToIngest > maxPages) {
            throw new QuotaExceededException("Monthly page upload limit reached.", "PAGES", user.getSubscriptionTier());
        }

        // Update counts
        user.setCurrentMonthDocsIngested(user.getCurrentMonthDocsIngested() + 1);
        user.setCurrentMonthPagesIngested(user.getCurrentMonthPagesIngested() + pagesToIngest);
        userRepository.save(user);
    }

    /**
     * Checks if the user has premium queries remaining.
     * 
     * @param user User
     * @return true if they can use the premium model, false if they should fallback to standard.
     */
    @Transactional
    public boolean consumePremiumQueryIfAvailable(User detachedUser) {
        User user = userRepository.findByIdForUpdate(detachedUser.getId())
                .orElseThrow(() -> new IllegalStateException("User not found: " + detachedUser.getId()));
        checkAndResetMonthlyQuota(user);

        boolean isPro = "PRO".equalsIgnoreCase(user.getSubscriptionTier());
        int maxQueries = isPro ? PRO_MAX_PREMIUM_QUERIES : FREE_MAX_PREMIUM_QUERIES;

        if (user.getCurrentMonthPremiumQueries() < maxQueries) {
            user.setCurrentMonthPremiumQueries(user.getCurrentMonthPremiumQueries() + 1);
            userRepository.save(user);
            return true;
        }

        return false;
    }

    private void checkAndResetMonthlyQuota(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime quotaStart = user.getCurrentQuotaPeriodStart();

        if (quotaStart == null) {
            user.setCurrentQuotaPeriodStart(now);
            userRepository.save(user);
            return;
        }

        // If the current month and year are different from the quota start month and year, reset.
        if (now.getYear() > quotaStart.getYear() || now.getMonthValue() > quotaStart.getMonthValue()) {
            user.setCurrentMonthDocsIngested(0);
            user.setCurrentMonthPagesIngested(0);
            user.setCurrentMonthPremiumQueries(0);
            user.setCurrentQuotaPeriodStart(now);
            userRepository.save(user);
        }
    }
}
