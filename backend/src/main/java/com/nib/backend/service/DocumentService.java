package com.nib.backend.service;

import com.nib.backend.dto.DocumentResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
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

    public DocumentResponse uploadDocument(MultipartFile file, User user) {
        if (file.isEmpty()) throw new IllegalArgumentException("File cannot be empty");
        if (!isPdf(file)) throw new IllegalArgumentException("Only PDF files are supported");

        byte[] pdfBytes = readBytes(file);
        int pageCount = getPageCount(pdfBytes);
        String storagePath = user.getId() + "/" + UUID.randomUUID() + ".pdf";

        storageService.uploadFile(storagePath, pdfBytes, "application/pdf");

        Document document = documentRepository.save(Document.builder()
                .user(user)
                .filename(sanitizeFilename(file.getOriginalFilename()))
                .originalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf")
                .storagePath(storagePath)
                .fileSizeBytes(file.getSize())
                .pageCount(pageCount)
                .build());

        log.info("Saved document {} for user {}", document.getId(), user.getId());
        return toResponse(document, storageService.generateSignedUrl(storagePath, 3600));
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(User user, String search) {
        List<Document> docs = (search != null && !search.isBlank())
                ? documentRepository.findByUserAndOriginalFilenameContainingIgnoreCaseOrderByCreatedAtDesc(user, search.trim())
                : documentRepository.findByUserOrderByCreatedAtDesc(user);

        return docs.stream()
                .map(doc -> toResponse(doc, storageService.generateSignedUrl(doc.getStoragePath(), 3600)))
                .collect(Collectors.toList());
    }

    public DocumentResponse mergeDocuments(UUID baseDocumentId, MultipartFile baseFile, MultipartFile mergeFile, User user) {
        byte[] baseBytes;
        String baseFilename;

        if (baseDocumentId != null) {
            Document baseDoc = documentRepository.findByIdAndUser(baseDocumentId, user)
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

        String originalFilename = "Merged: " + baseFilename + " + " + mergeFile.getOriginalFilename();
        Document document = documentRepository.save(Document.builder()
                .user(user)
                .filename("merged_" + System.currentTimeMillis() + ".pdf")
                .originalFilename(originalFilename)
                .storagePath(storagePath)
                .fileSizeBytes((long) mergedBytes.length)
                .pageCount(getPageCount(mergedBytes))
                .build());

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

    private String sanitizeFilename(String filename) {
        if (filename == null) return "document.pdf";
        return filename.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }

    private DocumentResponse toResponse(Document doc, String signedUrl) {
        return new DocumentResponse(
                doc.getId(),
                doc.getFilename(),
                doc.getOriginalFilename(),
                signedUrl,
                doc.getFileSizeBytes(),
                doc.getPageCount(),
                doc.getCreatedAt()
        );
    }
}
