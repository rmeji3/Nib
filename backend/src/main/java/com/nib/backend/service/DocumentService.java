package com.nib.backend.service;

import com.nib.backend.dto.DocumentResponse;
import com.nib.backend.dto.PagedResponse;
import com.nib.backend.exception.DocumentNotFoundException;
import com.nib.backend.exception.StorageException;
import com.nib.backend.model.Document;
import com.nib.backend.model.User;
import com.nib.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final SupabaseStorageService storageService;
    private final IngestionService ingestionService;

    public DocumentResponse uploadDocuments(List<MultipartFile> files, String customName, User user) {
        if (files == null || files.isEmpty())
            throw new IllegalArgumentException("At least one file is required");

        for (MultipartFile f : files) {
            if (f.isEmpty()) throw new IllegalArgumentException("File cannot be empty");
            if (!isPdf(f)) throw new IllegalArgumentException("Only PDF files are supported");
        }

        byte[] pdfBytes;
        String originalFilename;

        if (files.size() == 1) {
            pdfBytes = readBytes(files.get(0));
            originalFilename = files.get(0).getOriginalFilename() != null
                    ? files.get(0).getOriginalFilename() : "document.pdf";
        } else {
            pdfBytes = readBytes(files.get(0));
            for (int i = 1; i < files.size(); i++) {
                pdfBytes = mergePdfs(pdfBytes, readBytes(files.get(i)));
            }
            String firstName = files.get(0).getOriginalFilename() != null
                    ? files.get(0).getOriginalFilename() : "document.pdf";
            originalFilename = stripPdf(firstName) + " (+" + (files.size() - 1) + " more).pdf";
        }

        if (customName != null && !customName.isBlank()) {
            String trimmed = customName.trim();
            originalFilename = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : trimmed + ".pdf";
        }

        int pageCount = getPageCount(pdfBytes);
        String storagePath = user.getId() + "/" + UUID.randomUUID() + ".pdf";
        storageService.uploadFile(storagePath, pdfBytes, "application/pdf");

        Document document = documentRepository.save(Document.builder()
                .user(user)
                .filename(sanitizeFilename(originalFilename))
                .originalFilename(originalFilename)
                .storagePath(storagePath)
                .fileSizeBytes((long) pdfBytes.length)
                .pageCount(pageCount)
                .build());

        log.info("Saved document {} ({} file(s)) for user {}", document.getId(), files.size(), user.getId());
        ingestionService.createAndTrigger(document.getId());
        return toResponse(document, storageService.generateSignedUrl(storagePath, 3600));
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> listDocuments(User user, String search, Pageable pageable) {
        Page<Document> docs = (search != null && !search.isBlank())
                ? documentRepository.findByUserAndOriginalFilenameContainingIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(user, search.trim(), pageable)
                : documentRepository.findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(user, pageable);

        List<DocumentResponse> content = docs.stream()
                .map(doc -> toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600)))
                .collect(Collectors.toList());

        return new PagedResponse<>(
                content,
                docs.getNumber(),
                docs.getSize(),
                docs.getTotalElements(),
                docs.getTotalPages(),
                docs.isLast()
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> listTrash(User user, Pageable pageable) {
        Page<Document> docs = documentRepository.findByUserAndDeletedAtIsNotNullOrderByDeletedAtDesc(user, pageable);
        List<DocumentResponse> content = docs.stream()
                .map(doc -> toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600)))
                .collect(Collectors.toList());

        return new PagedResponse<>(
                content,
                docs.getNumber(),
                docs.getSize(),
                docs.getTotalElements(),
                docs.getTotalPages(),
                docs.isLast()
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> listStarredDocuments(User user, Pageable pageable) {
        Page<Document> docs = documentRepository.findByUserAndIsStarredTrueAndDeletedAtIsNullOrderByCreatedAtDesc(user, pageable);
        List<DocumentResponse> content = docs.stream()
                .map(doc -> toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600)))
                .collect(Collectors.toList());

        return new PagedResponse<>(
                content,
                docs.getNumber(),
                docs.getSize(),
                docs.getTotalElements(),
                docs.getTotalPages(),
                docs.isLast()
        );
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID id, User user) {
        Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        return toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600));
    }

    @Transactional(readOnly = true)
    public byte[] getDocumentContent(UUID id, User user) {
        Document doc = documentRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        return storageService.downloadFile(doc.getStoragePath());
    }

    public DocumentResponse renameDocument(UUID id, String name, User user) {
        Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        String trimmed = name.trim();
        String displayName = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : trimmed + ".pdf";
        doc.setOriginalFilename(displayName);
        doc.setFilename(sanitizeFilename(displayName));
        documentRepository.save(doc);
        log.info("Renamed document {} to '{}'", id, displayName);
        return toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600));
    }

    public DocumentResponse toggleStar(UUID id, User user) {
        Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        doc.setStarred(!doc.isStarred());
        documentRepository.save(doc);
        log.info("Toggled star on document {} for user {}. Now starred: {}", id, user.getId(), doc.isStarred());
        return toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600));
    }

    /** Move a document to trash (soft delete). */
    public void softDelete(UUID id, User user) {
        Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        doc.setDeletedAt(LocalDateTime.now());
        documentRepository.save(doc);
        log.info("Soft-deleted document {} for user {}", id, user.getId());
    }

    /** Restore a trashed document back to the active library. */
    public DocumentResponse restoreDocument(UUID id, User user) {
        Document doc = documentRepository.findByIdAndUser(id, user)
                .filter(d -> d.getDeletedAt() != null)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        doc.setDeletedAt(null);
        documentRepository.save(doc);
        log.info("Restored document {} for user {}", id, user.getId());
        return toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600));
    }

    /** Permanently delete a document from both the DB and Supabase storage. */
    public void permanentDelete(UUID id, User user) {
        Document doc = documentRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        String path = doc.getStoragePath();
        documentRepository.delete(doc);
        try {
            storageService.deleteFile(path);
        } catch (Exception ex) {
            log.warn("Could not delete storage object {} — it may have already been removed: {}", path, ex.getMessage());
        }
        log.info("Permanently deleted document {} for user {}", id, user.getId());
    }

    public DocumentResponse mergeDocuments(UUID baseDocumentId, MultipartFile baseFile, MultipartFile mergeFile, User user) {
        byte[] baseBytes;
        String baseFilename;
        Document baseDoc = null;

        if (baseDocumentId != null) {
            baseDoc = documentRepository.findByIdAndUserAndDeletedAtIsNull(baseDocumentId, user)
                    .orElseThrow(() -> new DocumentNotFoundException(baseDocumentId));
            baseBytes = storageService.downloadFile(baseDoc.getStoragePath());
            baseFilename = baseDoc.getOriginalFilename();
        } else if (baseFile != null && !baseFile.isEmpty()) {
            if (!isPdf(baseFile)) throw new IllegalArgumentException("Base file must be a PDF");
            baseBytes = readBytes(baseFile);
            baseFilename = baseFile.getOriginalFilename() != null ? baseFile.getOriginalFilename() : "document.pdf";
        } else {
            throw new IllegalArgumentException("Either baseDocumentId or baseFile is required");
        }

        if (mergeFile == null || mergeFile.isEmpty()) throw new IllegalArgumentException("Merge file cannot be empty");
        if (!isPdf(mergeFile)) throw new IllegalArgumentException("Merge file must be a PDF");

        byte[] mergedBytes = mergePdfs(baseBytes, readBytes(mergeFile));
        String storagePath = user.getId() + "/" + UUID.randomUUID() + ".pdf";
        storageService.uploadFile(storagePath, mergedBytes, "application/pdf");

        Document document;
        if (baseDoc != null) {
            String oldPath = baseDoc.getStoragePath();
            baseDoc.setStoragePath(storagePath);
            baseDoc.setFileSizeBytes((long) mergedBytes.length);
            baseDoc.setPageCount(getPageCount(mergedBytes));
            baseDoc.setFilename("merged_" + System.currentTimeMillis() + ".pdf");
            document = documentRepository.save(baseDoc);
            try {
                storageService.deleteFile(oldPath);
            } catch (Exception ex) {
                log.warn("Could not delete old storage object {}", oldPath, ex);
            }
        } else {
            String originalFilename = stripPdf(baseFilename) + " (merged).pdf";
            document = documentRepository.save(Document.builder()
                    .user(user)
                    .filename("merged_" + System.currentTimeMillis() + ".pdf")
                    .originalFilename(originalFilename)
                    .storagePath(storagePath)
                    .fileSizeBytes((long) mergedBytes.length)
                    .pageCount(getPageCount(mergedBytes))
                    .build());
        }

        log.info("Merged document {} for user {}", document.getId(), user.getId());
        return toResponse(document, storageService.generateSignedUrl(storagePath, 3600));
    }

    private byte[] mergePdfs(byte[] first, byte[] second) {
        try (PDDocument doc1 = Loader.loadPDF(first);
             PDDocument doc2 = Loader.loadPDF(second)) {
            PDFMergerUtility merger = new PDFMergerUtility();
            merger.appendDocument(doc1, doc2);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc1.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new StorageException("Failed to merge PDF files", ex);
        }
    }

    private int getPageCount(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            return doc.getNumberOfPages();
        } catch (IOException ex) {
            log.warn("Could not determine page count", ex);
            return 0;
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new StorageException("Failed to read uploaded file", ex);
        }
    }

    private boolean isPdf(MultipartFile file) {
        String type = file.getContentType();
        String name = file.getOriginalFilename();
        return "application/pdf".equals(type)
                || (name != null && name.toLowerCase().endsWith(".pdf"));
    }

    /** Removes the trailing .pdf extension (case-insensitive) for use in auto-generated names. */
    private String stripPdf(String name) {
        if (name == null) return "document";
        return name.replaceAll("(?i)\\.pdf$", "");
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "document.pdf";
        return filename.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> listRecentDocuments(User user, Pageable pageable) {
        Page<Document> docs = documentRepository
                .findByUserAndLastOpenedAtIsNotNullAndDeletedAtIsNullOrderByLastOpenedAtDesc(user, pageable);
        List<DocumentResponse> content = docs.stream()
                .map(doc -> toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600)))
                .collect(Collectors.toList());
        return new PagedResponse<>(content, docs.getNumber(), docs.getSize(),
                docs.getTotalElements(), docs.getTotalPages(), docs.isLast());
    }

    public DocumentResponse recordOpen(UUID id, User user) {
        int updated = documentRepository.updateLastOpenedAt(id, user, LocalDateTime.now());
        if (updated == 0) throw new DocumentNotFoundException(id);
        Document doc = documentRepository.findByIdAndUserAndDeletedAtIsNull(id, user)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        return toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600));
    }

    private DocumentResponse toResponse(Document doc, String signedUrl) {
        return new DocumentResponse(
                doc.getId(),
                doc.getFilename(),
                doc.getOriginalFilename(),
                signedUrl,
                doc.getFileSizeBytes(),
                doc.getPageCount(),
                doc.getCreatedAt() != null ? doc.getCreatedAt().toString() : null,
                doc.getDeletedAt() != null ? doc.getDeletedAt().toString() : null,
                doc.isStarred(),
                doc.getLastOpenedAt() != null ? doc.getLastOpenedAt().toString() : null
        );
    }
}
