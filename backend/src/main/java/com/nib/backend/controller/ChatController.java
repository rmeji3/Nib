package com.nib.backend.controller;

import com.nib.backend.dto.ChatMessageResponse;
import com.nib.backend.dto.ChatQueryRequest;
import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.ChatSessionResponse;
import com.nib.backend.exception.RateLimitException;
import com.nib.backend.model.User;
import com.nib.backend.service.ChatRateLimiter;
import com.nib.backend.service.ChatService;
import com.nib.backend.service.CostTelemetryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;
    private final ChatRateLimiter rateLimiter;
    private final CostTelemetryService costTelemetryService;

    /** Get or create the chat session for a document. */
    @GetMapping("/sessions/document/{documentId}")
    public ResponseEntity<ChatSessionResponse> getOrCreateSession(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(chatService.getOrCreateSession(documentId, user));
    }

    /**
     * Send a question and get a grounded answer with citations.
     * Phase 4: per-user rate limit (default 20 req / 60 s).
     */
    @PostMapping("/sessions/{sessionId}/query")
    public ResponseEntity<ChatQueryResponse> query(
            @PathVariable UUID sessionId,
            @Valid @RequestBody ChatQueryRequest request,
            @AuthenticationPrincipal User user
    ) {
        if (!rateLimiter.tryAcquire(user.getId())) {
            long retryAfter = rateLimiter.secondsUntilReset(user.getId());
            costTelemetryService.record(
                    user.getId(),
                    CostTelemetryService.RATE_LIMIT_HIT,
                    1,
                    Map.of("scope", "chat", "retryAfterSeconds", retryAfter)
            );
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter))
                    .build();
        }
        costTelemetryService.record(
                user.getId(),
                CostTelemetryService.CHAT_CALL,
                1,
                Map.of("sessionId", sessionId.toString())
        );
        return ResponseEntity.ok(chatService.query(sessionId, request.question(), user));
    }

    /** Fetch all messages in a session. */
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(chatService.getMessages(sessionId, user));
    }
}
