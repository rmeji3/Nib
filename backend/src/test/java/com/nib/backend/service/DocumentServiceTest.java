package com.nib.backend.service;

import com.nib.backend.exception.StorageException;
import com.nib.backend.model.Document;
import com.nib.backend.model.User;
import com.nib.backend.repository.ContentBlockRepository;
import com.nib.backend.repository.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DocumentServiceTest {

    private final DocumentRepository documentRepository = mock(DocumentRepository.class);
    private final ContentBlockRepository contentBlockRepository = mock(ContentBlockRepository.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final SupabaseStorageService storageService = mock(SupabaseStorageService.class);
    private final IngestionService ingestionService = mock(IngestionService.class);
    private final SubscriptionQuotaService subscriptionQuotaService = mock(SubscriptionQuotaService.class);
    private final DocumentService service = new DocumentService(
            documentRepository,
            contentBlockRepository,
            jdbcTemplate,
            storageService,
            ingestionService,
            subscriptionQuotaService
    );

    @Test
    void listDocumentsReturnsMetadataWhenStorageObjectWasDeleted() {
        User user = testUser();
        Document document = testDocument(user);
        PageRequest pageable = PageRequest.of(0, 10);
        when(documentRepository.findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(user, pageable))
                .thenReturn(new PageImpl<>(List.of(document), pageable, 1));
        when(storageService.generateSignedUrl(document.getStoragePath(), 3600))
                .thenThrow(new StorageException(
                        "Failed to generate signed URL: " + document.getStoragePath(),
                        new RuntimeException("404 Object not found")
                ));

        var response = service.listDocuments(user, null, pageable);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).id()).isEqualTo(document.getId());
        assertThat(response.content().get(0).storageUrl()).isNull();
    }

    @Test
    void listDocumentsStillSurfacesNonMissingStorageFailures() {
        User user = testUser();
        Document document = testDocument(user);
        PageRequest pageable = PageRequest.of(0, 10);
        when(documentRepository.findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(user, pageable))
                .thenReturn(new PageImpl<>(List.of(document), pageable, 1));
        when(storageService.generateSignedUrl(document.getStoragePath(), 3600))
                .thenThrow(new StorageException("Supabase auth failed", new RuntimeException("401 Unauthorized")));

        assertThatThrownBy(() -> service.listDocuments(user, null, pageable))
                .isInstanceOf(StorageException.class)
                .hasMessageContaining("Supabase auth failed");
    }

    private User testUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .email("ada@example.com")
                .name("Ada")
                .password("pw")
                .build();
    }

    private Document testDocument(User user) {
        UUID id = UUID.randomUUID();
        return Document.builder()
                .id(id)
                .user(user)
                .filename("resume.pdf")
                .originalFilename("resume.pdf")
                .storagePath(user.getId() + "/" + id + ".pdf")
                .fileSizeBytes(1024L)
                .pageCount(1)
                .build();
    }
}
