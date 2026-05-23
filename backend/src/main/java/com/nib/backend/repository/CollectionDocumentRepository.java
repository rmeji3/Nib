package com.nib.backend.repository;

import com.nib.backend.model.Collection;
import com.nib.backend.model.CollectionDocument;
import com.nib.backend.model.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollectionDocumentRepository extends JpaRepository<CollectionDocument, UUID> {

    long countByCollection(Collection collection);

    Page<CollectionDocument> findByCollectionOrderByAddedAtDesc(Collection collection, Pageable pageable);

    Optional<CollectionDocument> findByCollectionAndDocument(Collection collection, Document document);

    boolean existsByCollectionAndDocument(Collection collection, Document document);

    List<CollectionDocument> findByCollection(Collection collection);
}
