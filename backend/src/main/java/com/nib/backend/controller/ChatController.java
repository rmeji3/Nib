package com.nib.backend.controller;

import com.nib.backend.dto.ChatMessageResponse;
import com.nib.backend.dto.ChatMessageFeedbackRequest;
import com.nib.backend.dto.ChatQueryRequest;
import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.ChatSessionResponse;
import com.nib.backend.dto.ChatStarterResponse;
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

    /** List chat sessions for a document, newest activity first. */
    @GetMapping("/sessions/document/{documentId}/all")
    public ResponseEntity<List<ChatSessionResponse>> listSessions(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(chatService.listSessions(documentId, user));
    }

    /** Create a fresh chat session for a document. */
    @PostMapping("/sessions/document/{documentId}")
    public ResponseEntity<ChatSessionResponse> createSession(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(chatService.createSession(documentId, user));
    }

    /** Document-aware suggested prompts shown only before a chat has messages. */
    @GetMapping("/sessions/document/{documentId}/starters")
    public ResponseEntity<List<ChatStarterResponse>> getConversationStarters(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(chatService.getConversationStarters(documentId, user));
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

    /** Delete a single chat message from a session owned by the authenticated user. */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User user
    ) {
        chatService.deleteMessage(messageId, user);
        return ResponseEntity.noContent().build();
    }

    /** Persist feedback for an assistant chat message. */
    @PostMapping("/messages/{messageId}/feedback")
    public ResponseEntity<Void> addMessageFeedback(
            @PathVariable UUID messageId,
            @Valid @RequestBody ChatMessageFeedbackRequest request,
            @AuthenticationPrincipal User user
    ) {
        chatService.addMessageFeedback(messageId, request, user);
        return ResponseEntity.noContent().build();
    }

    /** Delete a chat session and its message history. */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal User user
    ) {
        chatService.deleteSession(sessionId, user);
        return ResponseEntity.noContent().build();
    }
}
