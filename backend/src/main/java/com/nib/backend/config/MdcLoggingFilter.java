package com.nib.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Phase 4 — Observability: injects structured context into SLF4J MDC so every
 * log line carries:
 *
 *   requestId  — random UUID per HTTP request (useful for log aggregation)
 *   userId     — authenticated user ID (or "anonymous")
 *   path       — the request URI
 *
 * Cleared automatically after the response is written, so contexts never bleed
 * across requests in thread-pool scenarios.
 */
@Component
@Order(1)
public class MdcLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_KEY = "requestId";
    private static final String USER_ID_KEY    = "userId";
    private static final String PATH_KEY       = "path";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain         chain
    ) throws ServletException, IOException {
        try {
            MDC.put(REQUEST_ID_KEY, UUID.randomUUID().toString());
            MDC.put(PATH_KEY, request.getRequestURI());

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = (auth != null && auth.isAuthenticated()
                    && auth.getPrincipal() instanceof com.nib.backend.model.User u)
                    ? u.getId().toString()
                    : "anonymous";
            MDC.put(USER_ID_KEY, userId);

            // Expose requestId as a response header so clients can correlate logs
            response.setHeader("X-Request-Id", MDC.get(REQUEST_ID_KEY));

            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
