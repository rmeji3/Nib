package com.nib.backend.service;

import com.nib.backend.dto.CollectionSummary;
import com.nib.backend.dto.DocumentResponse;
import com.nib.backend.dto.PagedResponse;
import com.nib.backend.exception.CollectionNotFoundException;
import com.nib.backend.exception.DocumentNotFoundException;
import com.nib.backend.model.Collection;
import com.nib.backend.model.CollectionDocument;
import com.nib.backend.model.Document;
import com.nib.backend.model.User;
import com.nib.backend.repository.CollectionDocumentRepository;
import com.nib.backend.repository.CollectionRepository;
import com.nib.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final CollectionDocumentRepository collectionDocumentRepository;
    private final DocumentRepository documentRepository;
    private final SupabaseStorageService storageService;

    @Transactional(readOnly = true)
    public List<CollectionSummary> listCollections(User user) {
        return collectionRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(c -> new CollectionSummary(
                        c.getId(),
                        c.getName(),
                        collectionDocumentRepository.countByCollection(c),
                        c.getCreatedAt().toString()
                ))
                .toList();
    }

    public CollectionSummary createCollection(String name, User user) {
        Collection c = collectionRepository.save(Collection.builder()
                .user(user)
                .name(name.trim())
                .build());
        log.info("Created collection '{}' for user {}", c.getName(), user.getId());
        return new CollectionSummary(c.getId(), c.getName(), 0L, c.getCreatedAt().toString());
    }

    public CollectionSummary renameCollection(UUID id, String name, User user) {
        Collection c = collectionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new CollectionNotFoundException(id));
        c.setName(name.trim());
        collectionRepository.save(c);
        long count = collectionDocumentRepository.countByCollection(c);
        log.info("Renamed collection {} to '{}' for user {}", id, name, user.getId());
        return new CollectionSummary(c.getId(), c.getName(), count, c.getCreatedAt().toString());
    }

    public void deleteCollection(UUID id, User user) {
        Collection c = collectionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new CollectionNotFoundException(id));
        // @OnDelete(CASCADE) on the FK handles DB cleanup; explicit delete ensures JPA cache is consistent
        List<CollectionDocument> entries = collectionDocumentRepository.findByCollection(c);
        collectionDocumentRepository.deleteAll(entries);
        collectionRepository.delete(c);
        log.info("Deleted collection {} for user {}", id, user.getId());
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> getCollectionDocuments(UUID id, User user, Pageable pageable) {
        Collection c = collectionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new CollectionNotFoundException(id));
        Page<CollectionDocument> page = collectionDocumentRepository.findByCollectionOrderByAddedAtDesc(c, pageable);
        List<DocumentResponse> content = page.stream()
                .map(cd -> toDocumentResponse(cd.getDocument()))
                .toList();
        return new PagedResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public void addDocuments(UUID collectionId, List<UUID> documentIds, User user) {
        Collection c = collectionRepository.findByIdAndUser(collectionId, user)
                .orElseThrow(() -> new CollectionNotFoundException(collectionId));
        int added = 0;
        for (UUID docId : documentIds) {
            Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(docId, user)
                    .orElseThrow(() -> new DocumentNotFoundException(docId));
            if (!collectionDocumentRepository.existsByCollectionAndDocument(c, doc)) {
                collectionDocumentRepository.save(CollectionDocument.builder()
                        .collection(c).document(doc).build());
                added++;
            }
        }
        log.info("Added {} new documents to collection {} for user {}", added, collectionId, user.getId());
    }

    public void removeDocument(UUID collectionId, UUID documentId, User user) {
        Collection c = collectionRepository.findByIdAndUser(collectionId, user)
                .orElseThrow(() -> new CollectionNotFoundException(collectionId));
        Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(documentId, user)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
        collectionDocumentRepository.findByCollectionAndDocument(c, doc)
                .ifPresent(collectionDocumentRepository::delete);
        log.info("Removed document {} from collection {} for user {}", documentId, collectionId, user.getId());
    }

    private DocumentResponse toDocumentResponse(Document doc) {
        String signedUrl = storageService.generateSignedUrl(doc.getStoragePath(), 3600);
        return new DocumentResponse(
                doc.getId(), doc.getFilename(), doc.getOriginalFilename(), signedUrl,
                doc.getFileSizeBytes(), doc.getPageCount(),
                doc.getCreatedAt() != null ? doc.getCreatedAt().toString() : null,
                doc.getDeletedAt() != null ? doc.getDeletedAt().toString() : null,
                doc.isStarred(),
                doc.getLastOpenedAt() != null ? doc.getLastOpenedAt().toString() : null
        );
    }
}
