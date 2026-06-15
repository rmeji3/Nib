package com.nib.backend.controller;

import com.nib.backend.dto.AuthRequest;
import com.nib.backend.dto.AuthResponse;
import com.nib.backend.dto.ForgotPasswordRequest;
import com.nib.backend.dto.RegisterRequest;
import com.nib.backend.dto.ResetPasswordRequest;
import com.nib.backend.service.AuthService;
import com.nib.backend.service.AuthService.AuthServiceResult;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.nib.backend.model.User;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** 7 days in seconds */
    private static final int COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

    /**
     * When the frontend and API live on different sites (e.g. Vercel + Render), the auth
     * cookie must be {@code SameSite=None; Secure} or the browser won't send it on API
     * calls. Set {@code app.cookie.cross-site=true} in production. Defaults to false so
     * local http://localhost dev keeps working (Secure is rejected on plain HTTP).
     */
    @Value("${app.cookie.cross-site:false}")
    private boolean cookieCrossSite;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        // No auto-login: the user must confirm their email, then sign in.
        authService.register(request);
        return ResponseEntity.ok(Map.of(
                "message", "Account created. Check your email to confirm your address before signing in.",
                "email", request.email()
        ));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(
            @RequestBody Map<String, String> body,
            HttpServletResponse response
    ) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        AuthServiceResult result = authService.authenticateWithGoogle(code);
        setTokenCookie(response, result.token());
        return ResponseEntity.ok(result.response());
    }

    @GetMapping("/verify")
    public ResponseEntity<Map<String, String>> verify(@RequestParam("token") String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("message", "Email confirmed. You can now sign in."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email != null && !email.isBlank()) {
            authService.resendVerification(email);
        }
        // Always 200 — don't reveal whether the email exists / is already verified.
        return ResponseEntity.ok(Map.of("message", "If that account needs confirmation, a new email is on its way."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        authService.requestPasswordReset(request.email());
        // Always 200 — don't reveal whether the email is registered.
        return ResponseEntity.ok(Map.of(
                "message", "If an account exists for that email, a reset link is on its way."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        authService.resetPassword(request.token(), request.password());
        return ResponseEntity.ok(Map.of("message", "Password updated. You can now sign in."));
    }

    @PostMapping("/authenticate")
    public ResponseEntity<AuthResponse> authenticate(
            @Valid @RequestBody AuthRequest request,
            HttpServletResponse response
    ) {
        AuthServiceResult result = authService.authenticate(request);
        setTokenCookie(response, result.token());
        return ResponseEntity.ok(result.response());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getSettings(),
                user.getSubscriptionTier(),
                user.getSubscriptionPeriodEnd(),
                user.isSubscriptionCancelAtPeriodEnd()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader("Set-Cookie", "token=; Path=/; HttpOnly; " + cookieAttributes() + " Max-Age=0");
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------

    private void setTokenCookie(HttpServletResponse response, String token) {
        // Set the cookie via the raw header so we can include SameSite (Jakarta Cookie
        // API doesn't support SameSite yet).
        response.addHeader("Set-Cookie",
                String.format("token=%s; Path=/; HttpOnly; %s Max-Age=%d",
                        token, cookieAttributes(), COOKIE_MAX_AGE));
    }

    /**
     * Cross-site (prod): {@code SameSite=None; Secure} so the cookie is sent on API calls
     * from a different origin. Same-site (local dev): {@code SameSite=Lax} with no Secure
     * flag, since browsers reject Secure cookies over plain http://localhost.
     */
    private String cookieAttributes() {
        return cookieCrossSite ? "SameSite=None; Secure;" : "SameSite=Lax;";
    }
}
