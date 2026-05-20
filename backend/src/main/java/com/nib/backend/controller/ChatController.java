package com.nib.backend.controller;

import com.nib.backend.dto.ChatMessageResponse;
import com.nib.backend.dto.ChatQueryRequest;
import com.nib.backend.dto.ChatQueryResponse;
import com.nib.backend.dto.ChatSessionResponse;
import com.nib.backend.model.User;
import com.nib.backend.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /** Get or create the chat session for a document. */
    @GetMapping("/sessions/document/{documentId}")
    public ResponseEntity<ChatSessionResponse> getOrCreateSession(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(chatService.getOrCreateSession(documentId, user));
    }

    /** Send a question and get a grounded answer with citations. */
    @PostMapping("/sessions/{sessionId}/query")
    public ResponseEntity<ChatQueryResponse> query(
            @PathVariable UUID sessionId,
            @Valid @RequestBody ChatQueryRequest request,
            @AuthenticationPrincipal User user
    ) {
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
