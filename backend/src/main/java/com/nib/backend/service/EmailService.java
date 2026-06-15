package com.nib.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Sends transactional email via the Resend HTTP API (https://resend.com/docs/api-reference).
 * Uses {@link RestClient} directly so we don't pull in an extra SDK dependency.
 */
@Slf4j
@Service
public class EmailService {

    private final RestClient restClient;
    private final String apiKey;
    private final String fromEmail;
    private final String frontendUrl;

    public EmailService(
            @Value("${resend.api-key:}") String apiKey,
            @Value("${resend.from-email}") String fromEmail,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
        this.frontendUrl = frontendUrl;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .build();
    }

    /**
     * Sends the account verification email. The link points at the frontend /verify page,
     * which calls the backend to confirm the token.
     *
     * @throws IllegalStateException if Resend isn't configured (fail loudly)
     */
    public void sendVerificationEmail(String toEmail, String name, String token) {
        String verifyUrl = frontendUrl + "/verify?token=" + token;
        String html = """
                <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
                  <h2 style="margin:0 0 12px">Confirm your email</h2>
                  <p style="margin:0 0 16px;line-height:1.5">Hi %s, thanks for signing up for Nib. Please confirm your email address to activate your account.</p>
                  <p style="margin:0 0 24px">
                    <a href="%s" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600">Confirm email</a>
                  </p>
                  <p style="margin:0;color:#666;font-size:13px;line-height:1.5">Or paste this link into your browser:<br><a href="%s">%s</a></p>
                  <p style="margin:16px 0 0;color:#999;font-size:12px">This link expires in 24 hours.</p>
                </div>
                """.formatted(escape(name), verifyUrl, verifyUrl, verifyUrl);

        send(toEmail, "Confirm your Nib account", html);
    }

    /**
     * Sends the password-reset email. The link points at the frontend /reset-password page,
     * which posts the token + new password back to the backend.
     *
     * @throws IllegalStateException if Resend isn't configured (fail loudly)
     */
    public void sendPasswordResetEmail(String toEmail, String name, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String html = """
                <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
                  <h2 style="margin:0 0 12px">Reset your password</h2>
                  <p style="margin:0 0 16px;line-height:1.5">Hi %s, we received a request to reset your Nib password. Click the button below to choose a new one. If you didn't request this, you can safely ignore this email.</p>
                  <p style="margin:0 0 24px">
                    <a href="%s" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600">Reset password</a>
                  </p>
                  <p style="margin:0;color:#666;font-size:13px;line-height:1.5">Or paste this link into your browser:<br><a href="%s">%s</a></p>
                  <p style="margin:16px 0 0;color:#999;font-size:12px">This link expires in 1 hour.</p>
                </div>
                """.formatted(escape(name), resetUrl, resetUrl, resetUrl);

        send(toEmail, "Reset your Nib password", html);
    }

    private void send(String toEmail, String subject, String html) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException(
                    "RESEND_API_KEY is not configured — cannot send email to " + toEmail);
        }

        try {
            restClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "from", fromEmail,
                            "to", toEmail,
                            "subject", subject,
                            "html", html
                    ))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Sent '{}' email to {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {} via Resend: {}", toEmail, e.getMessage());
            throw new IllegalStateException("Failed to send email. Please try again later.", e);
        }
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("<", "&lt;").replace(">", "&gt;");
    }
}
