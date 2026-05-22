package com.nib.backend.repository;

import com.nib.backend.model.Document;
import com.nib.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    // ── Active documents (deletedAt IS NULL) ──────────────────────────────────

    Page<Document> findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(User user, Pageable pageable);

    Page<Document> findByUserAndOriginalFilenameContainingIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(
            User user, String search, Pageable pageable);

    Page<Document> findByUserAndIsStarredTrueAndDeletedAtIsNullOrderByCreatedAtDesc(User user, Pageable pageable);

    Optional<Document> findByIdAndUserAndDeletedAtIsNull(UUID id, User user);

    // ── Trash (deletedAt IS NOT NULL) ─────────────────────────────────────────

    Page<Document> findByUserAndDeletedAtIsNotNullOrderByDeletedAtDesc(User user, Pageable pageable);

    // ── Recent (lastOpenedAt IS NOT NULL, ordered most-recent first) ─────────

    Page<Document> findByUserAndLastOpenedAtIsNotNullAndDeletedAtIsNullOrderByLastOpenedAtDesc(
            User user, Pageable pageable);

    // ── Stamp lastOpenedAt without triggering @PreUpdate on updatedAt ─────────

    @Modifying
    @Query("UPDATE Document d SET d.lastOpenedAt = :openedAt WHERE d.id = :id AND d.user = :user AND d.deletedAt IS NULL")
    int updateLastOpenedAt(@Param("id") UUID id, @Param("user") User user, @Param("openedAt") LocalDateTime openedAt);

    // ── Any state (for restore / permanent-delete lookups) ───────────────────

    Optional<Document> findByIdAndUser(UUID id, User user);
}
