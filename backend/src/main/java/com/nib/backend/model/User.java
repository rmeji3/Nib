package com.nib.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    // "credentials" (email+password) or "google". Default grandfathers existing rows.
    @Column(name = "provider", nullable = false, columnDefinition = "varchar(255) default 'credentials'")
    @Builder.Default
    private String provider = "credentials";

    // Google subject id ("sub") for accounts created via Google sign-in.
    @Column(name = "google_id", unique = true)
    private String googleId;

    @Column(columnDefinition = "TEXT")
    private String settings;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Email verification. columnDefinition default true grandfathers pre-existing rows
    // when the column is added; new users are inserted with the entity default (false).
    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "verification_token_expiry")
    private Instant verificationTokenExpiry;

    // Set when the user requests account deletion. The row survives only until the
    // background purge finishes; a non-null value means a purge is pending/retryable.
    @Column(name = "deletion_requested_at")
    private Instant deletionRequestedAt;

    // Subscription & Usage Quota Fields
    @Column(name = "subscription_tier", nullable = false, columnDefinition = "varchar(255) default 'FREE'")
    @Builder.Default
    private String subscriptionTier = "FREE";

    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Column(name = "current_month_docs_ingested", nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private int currentMonthDocsIngested = 0;

    @Column(name = "current_month_pages_ingested", nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private int currentMonthPagesIngested = 0;

    @Column(name = "current_month_premium_queries", nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private int currentMonthPremiumQueries = 0;

    @Column(name = "current_quota_period_start")
    private LocalDateTime currentQuotaPeriodStart;

    // Set when user is subscribed — when the current paid period ends (renewal or expiry date)
    @Column(name = "subscription_period_end")
    private Instant subscriptionPeriodEnd;

    // True when the subscription is scheduled to cancel at subscriptionPeriodEnd
    // (user still has PRO access until then, but it will NOT renew).
    @Column(name = "subscription_cancel_at_period_end", nullable = false,
            columnDefinition = "boolean default false")
    @Builder.Default
    private boolean subscriptionCancelAtPeriodEnd = false;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.currentQuotaPeriodStart == null) {
            this.currentQuotaPeriodStart = LocalDateTime.now();
        }
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Everyone is a standard user for now
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Unverified accounts are disabled — DaoAuthenticationProvider throws
        // DisabledException on login until the email is confirmed.
        return emailVerified;
    }
}
