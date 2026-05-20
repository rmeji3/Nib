package com.nib.backend.controller;

import com.nib.backend.dto.DocumentResponse;
import com.nib.backend.model.User;
import com.nib.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
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
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user
    ) {
        log.info("Upload request from user {} for '{}'", user.getId(), file.getOriginalFilename());
        return ResponseEntity.ok(documentService.uploadDocument(file, user));
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> list(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.listDocuments(user, search));
    }

    @PostMapping(value = "/merge", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> merge(
            @RequestParam(required = false) UUID baseDocumentId,
            @RequestParam(name = "baseFile", required = false) MultipartFile baseFile,
            @RequestParam("mergeFile") MultipartFile mergeFile,
            @AuthenticationPrincipal User user
    ) {
        log.info("Merge request from user {}", user.getId());
        return ResponseEntity.ok(documentService.mergeDocuments(baseDocumentId, baseFile, mergeFile, user));
    }
}
