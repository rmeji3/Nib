package com.nib.backend.controller;

import com.nib.backend.dto.DocumentResponse;
import com.nib.backend.dto.PagedResponse;
import com.nib.backend.dto.RenameRequest;
import com.nib.backend.model.User;
import com.nib.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(required = false) String name,
            @AuthenticationPrincipal User user
    ) {
        log.info("Upload request from user {} for {} file(s)", user.getId(), files.size());
        return ResponseEntity.ok(documentService.uploadDocuments(files, name, user));
    }

    @GetMapping
    public ResponseEntity<PagedResponse<DocumentResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.listDocuments(user, search, PageRequest.of(page, size)));
    }

    /** Returns all documents the user has moved to trash. */
    @GetMapping("/trash")
    public ResponseEntity<PagedResponse<DocumentResponse>> listTrash(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.listTrash(user, PageRequest.of(page, size)));
    }

    @GetMapping("/recent")
    public ResponseEntity<PagedResponse<DocumentResponse>> listRecent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.listRecentDocuments(user, PageRequest.of(page, size)));
    }

    @PostMapping("/{id}/open")
    public ResponseEntity<DocumentResponse> recordOpen(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.recordOpen(id, user));
    }

    @GetMapping("/starred")
    public ResponseEntity<PagedResponse<DocumentResponse>> listStarred(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.listStarredDocuments(user, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.getDocument(id, user));
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> getContent(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        byte[] content = documentService.getDocumentContent(id, user);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(content);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DocumentResponse> rename(
            @PathVariable UUID id,
            @Validated @RequestBody RenameRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.renameDocument(id, request.name(), user));
    }

    @PatchMapping("/{id}/star")
    public ResponseEntity<DocumentResponse> toggleStar(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.toggleStar(id, user));
    }

    /** Move a document to trash (soft delete). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        log.info("Soft-delete request for document {} from user {}", id, user.getId());
        documentService.softDelete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk/trash")
    public ResponseEntity<Void> bulkSoftDelete(
            @RequestBody List<UUID> ids,
            @AuthenticationPrincipal User user
    ) {
        log.info("Bulk soft-delete request for {} documents from user {}", ids.size(), user.getId());
        documentService.bulkSoftDelete(ids, user);
        return ResponseEntity.noContent().build();
    }

    /** Restore a trashed document back to the library. */
    @PostMapping("/{id}/restore")
    public ResponseEntity<DocumentResponse> restore(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        log.info("Restore request for document {} from user {}", id, user.getId());
        return ResponseEntity.ok(documentService.restoreDocument(id, user));
    }

    @PostMapping("/bulk/restore")
    public ResponseEntity<Void> bulkRestore(
            @RequestBody List<UUID> ids,
            @AuthenticationPrincipal User user
    ) {
        log.info("Bulk restore request for {} documents from user {}", ids.size(), user.getId());
        documentService.bulkRestore(ids, user);
        return ResponseEntity.noContent().build();
    }

    /** Permanently delete a trashed document from DB and storage. */
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDelete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        log.info("Permanent-delete request for document {} from user {}", id, user.getId());
        documentService.permanentDelete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk/permanent")
    public ResponseEntity<Void> bulkPermanentDelete(
            @RequestBody List<UUID> ids,
            @AuthenticationPrincipal User user
    ) {
        log.info("Bulk permanent-delete request for {} documents from user {}", ids.size(), user.getId());
        documentService.bulkPermanentDelete(ids, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/merge", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> merge(
            @RequestParam(required = false) UUID baseDocumentId,
            @RequestParam(name = "baseFile", required = false) MultipartFile baseFile,
            @RequestParam("mergeFiles") List<MultipartFile> mergeFiles,
            @AuthenticationPrincipal User user
    ) {
        log.info("Merge request from user {} ({} file(s))", user.getId(), mergeFiles.size());
        return ResponseEntity.ok(documentService.mergeDocuments(baseDocumentId, baseFile, mergeFiles, user));
    }
}
