package com.nib.backend.controller;

import com.nib.backend.service.AccountDeletionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Operational endpoints guarded by a shared secret (X-Admin-Token). Not part of the
 * normal user-facing API. If {@code app.admin-token} is unset, every request is rejected.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AccountDeletionService accountDeletionService;

    @Value("${app.admin-token:}")
    private String adminToken;

    /** Re-runs any account purges that never finished. */
    @PostMapping("/retry-account-deletions")
    public ResponseEntity<Map<String, Object>> retryAccountDeletions(
            @RequestHeader(value = "X-Admin-Token", required = false) String token) {
        requireAdmin(token);
        int requeued = accountDeletionService.retryPendingDeletions();
        return ResponseEntity.ok(Map.of("requeued", requeued));
    }

    private void requireAdmin(String token) {
        // No token configured → admin surface is disabled entirely.
        if (!StringUtils.hasText(adminToken) || !adminToken.equals(token)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }
}
