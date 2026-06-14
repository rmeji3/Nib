package com.nib.backend.service;

import com.nib.backend.dto.AuthRequest;
import com.nib.backend.dto.AuthResponse;
import com.nib.backend.dto.RegisterRequest;
import com.nib.backend.exception.EmailNotVerifiedException;
import com.nib.backend.model.User;
import com.nib.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final GoogleOAuthClient googleOAuthClient;

    /** Carries both the user-facing response and the raw JWT for cookie-setting. */
    public record AuthServiceResult(String token, AuthResponse response) {}

    private static final long TOKEN_TTL_HOURS = 24;

    /**
     * Registers a new user in an unverified state and emails them a confirmation link.
     * Does NOT log the user in — they must confirm their email, then sign in.
     */
    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }

        String token = UUID.randomUUID().toString();
        var user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .emailVerified(false)
                .verificationToken(token)
                .verificationTokenExpiry(Instant.now().plus(TOKEN_TTL_HOURS, ChronoUnit.HOURS))
                .build();

        userRepository.save(user);

        // Fail loudly: if email can't be sent, the transaction rolls back so the user
        // can retry rather than ending up with an unverifiable account.
        emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);
    }

    public AuthServiceResult authenticate(AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (DisabledException e) {
            throw new EmailNotVerifiedException(
                    "Please confirm your email address before signing in.");
        }

        var user = userRepository.findByEmail(request.email()).orElseThrow();

        var token = jwtService.generateToken(user);
        return new AuthServiceResult(token, toResponse(user));
    }

    /**
     * Signs in (or transparently signs up) a user via a Google authorization code.
     * Google accounts are email-verified by Google, so they skip our email confirmation.
     */
    @Transactional
    public AuthServiceResult authenticateWithGoogle(String code) {
        GoogleOAuthClient.GoogleProfile profile = googleOAuthClient.exchangeCode(code);

        if (!profile.emailVerified()) {
            throw new IllegalArgumentException("Your Google email address is not verified.");
        }

        User user = userRepository.findByGoogleId(profile.sub())
                .or(() -> userRepository.findByEmail(profile.email()))
                .map(existing -> {
                    // Link Google to a pre-existing (e.g. credentials) account on first use.
                    if (existing.getGoogleId() == null) {
                        existing.setGoogleId(profile.sub());
                    }
                    existing.setEmailVerified(true);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .name(profile.name())
                        .email(profile.email())
                        // Random unusable password — Google users never sign in with one.
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .provider("google")
                        .googleId(profile.sub())
                        .emailVerified(true)
                        .build()));

        var token = jwtService.generateToken(user);
        return new AuthServiceResult(token, toResponse(user));
    }

    /** Confirms an email-verification token: enables the account and clears the token. */
    @Transactional
    public void verifyEmail(String token) {
        var user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification link."));

        if (user.getVerificationTokenExpiry() == null
                || user.getVerificationTokenExpiry().isBefore(Instant.now())) {
            throw new IllegalArgumentException("This verification link has expired. Please request a new one.");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);
    }

    /**
     * Re-issues a verification email. Does nothing for unknown/already-verified accounts
     * (and never reveals which case it was) to avoid leaking registered emails.
     */
    @Transactional
    public void resendVerification(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.isEmailVerified()) return;
            String token = UUID.randomUUID().toString();
            user.setVerificationToken(token);
            user.setVerificationTokenExpiry(Instant.now().plus(TOKEN_TTL_HOURS, ChronoUnit.HOURS));
            userRepository.save(user);
            emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);
        });
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(user.getId(), user.getEmail(), user.getName(), user.getSettings(),
                user.getSubscriptionTier(), user.getSubscriptionPeriodEnd(),
                user.isSubscriptionCancelAtPeriodEnd());
    }
}
