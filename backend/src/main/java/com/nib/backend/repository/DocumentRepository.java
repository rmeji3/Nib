package com.nib.backend.repository;

import com.nib.backend.model.Document;
import com.nib.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUserOrderByCreatedAtDesc(User user);

    List<Document> findByUserAndOriginalFilenameContainingIgnoreCaseOrderByCreatedAtDesc(User user, String search);

    Optional<Document> findByIdAndUser(UUID id, User user);
}
