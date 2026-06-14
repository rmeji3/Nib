package com.nib.backend.controller;

import com.nib.backend.dto.CostDashboardResponse;
import com.nib.backend.dto.UserSettingsRequest;
import com.nib.backend.model.User;
import com.nib.backend.service.AccountDeletionService;
import com.nib.backend.service.CostTelemetryService;
import com.nib.backend.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final CostTelemetryService costTelemetryService;
    private final AccountDeletionService accountDeletionService;

    @GetMapping("/me/cost-dashboard")
    public ResponseEntity<CostDashboardResponse> getCostDashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(costTelemetryService.getDashboard(user.getId()));
    }

    @PutMapping("/me/settings")
    public ResponseEntity<Void> updateSettings(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UserSettingsRequest request
    ) {
        userService.updateSettings(user, request);
        return ResponseEntity.ok().build();
    }

    /**
     * Permanently deletes the authenticated user's account. Billing is stopped and the
     * account is locked immediately; all data (documents, storage, chats, telemetry) is
     * erased by a background job. The auth cookie is cleared so the client is signed out.
     */
    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @AuthenticationPrincipal User user,
            HttpServletResponse response
    ) {
        accountDeletionService.requestDeletion(user);
        // Clear the auth cookie (same attributes as logout).
        response.addHeader("Set-Cookie", "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
        return ResponseEntity.ok(Map.of(
                "message", "Your account has been deleted. All your data is being permanently removed."
        ));
    }
}
