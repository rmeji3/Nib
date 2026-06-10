package com.nib.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nib.backend.exception.ErrorResponse;
import com.nib.backend.model.User;
import com.nib.backend.service.CostTelemetryService;
import com.nib.backend.service.SlidingWindowRateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ApiRateLimitFilter extends OncePerRequestFilter {

    private static final String SCOPE = "api";
    private static final int TOO_MANY_REQUESTS = 429;

    private final CostControlProperties costControls;
    private final SlidingWindowRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;
    private final CostTelemetryService costTelemetryService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        if (!shouldLimit(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        var api = costControls.getApi();
        String subject = subjectFor(request);
        if (rateLimiter.tryAcquire(SCOPE, subject, api.getMaxRequestsPerWindow(), api.getWindowSeconds())) {
            filterChain.doFilter(request, response);
            return;
        }

        long retryAfter = rateLimiter.secondsUntilReset(SCOPE, subject, api.getWindowSeconds());
        recordRateLimitHit(subject, retryAfter, request);
        response.setStatus(TOO_MANY_REQUESTS);
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(
                "RATE_LIMITED",
                "Too many requests. Please try again in " + retryAfter + " seconds."
        ));
    }

    private boolean shouldLimit(HttpServletRequest request) {
        return costControls.isEnabled()
                && costControls.getApi().isEnabled()
                && request.getRequestURI().startsWith("/api/")
                && !"OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    private String subjectFor(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return "user:" + user.getId();
        }
        return "ip:" + clientIp(request);
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void recordRateLimitHit(String subject, long retryAfter, HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            costTelemetryService.record(
                    user.getId(),
                    CostTelemetryService.RATE_LIMIT_HIT,
                    1,
                    Map.of(
                            "scope", SCOPE,
                            "subject", subject,
                            "path", request.getRequestURI(),
                            "retryAfterSeconds", retryAfter
                    )
            );
        }
    }
}
