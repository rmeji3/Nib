package com.nib.backend.repository;

import com.nib.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    /**
     * Returns the most recent N messages for a session, ordered newest-first.
     * Used by the multi-turn query rewriter to get conversation context.
     * Pass {@code Pageable.ofSize(N)} to limit results.
     */
    List<ChatMessage> findBySessionIdOrderByCreatedAtDesc(UUID sessionId, Pageable pageable);
}
