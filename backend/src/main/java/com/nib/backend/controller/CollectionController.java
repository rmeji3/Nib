package com.nib.backend.controller;

import com.nib.backend.dto.AddToCollectionRequest;
import com.nib.backend.dto.CollectionSummary;
import com.nib.backend.dto.CreateCollectionRequest;
import com.nib.backend.dto.DocumentResponse;
import com.nib.backend.dto.PagedResponse;
import com.nib.backend.dto.RenameRequest;
import com.nib.backend.model.User;
import com.nib.backend.service.CollectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
@Slf4j
public class CollectionController {

    private final CollectionService collectionService;

    @GetMapping
    public ResponseEntity<List<CollectionSummary>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(collectionService.listCollections(user));
    }

    @PostMapping
    public ResponseEntity<CollectionSummary> create(
            @Validated @RequestBody CreateCollectionRequest request,
            @AuthenticationPrincipal User user
    ) {
        log.info("Create collection '{}' for user {}", request.name(), user.getId());
        return ResponseEntity.ok(collectionService.createCollection(request.name(), user));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CollectionSummary> rename(
            @PathVariable UUID id,
            @Validated @RequestBody RenameRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(collectionService.renameCollection(id, request.name(), user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        log.info("Delete collection {} for user {}", id, user.getId());
        collectionService.deleteCollection(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<PagedResponse<DocumentResponse>> getDocuments(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(collectionService.getCollectionDocuments(id, user, PageRequest.of(page, size)));
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<Void> addDocuments(
            @PathVariable UUID id,
            @Validated @RequestBody AddToCollectionRequest request,
            @AuthenticationPrincipal User user
    ) {
        collectionService.addDocuments(id, request.documentIds(), user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/documents/{documentId}")
    public ResponseEntity<Void> removeDocument(
            @PathVariable UUID id,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        collectionService.removeDocument(id, documentId, user);
        return ResponseEntity.noContent().build();
    }
}
