package com.nib.backend.repository;

import com.nib.backend.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findByDocumentIdAndUserIdOrderByCreatedAtDesc(UUID documentId, UUID userId);

    Optional<ChatSession> findByIdAndUserId(UUID id, UUID userId);
}
