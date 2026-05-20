package com.nib.backend.service;

import com.nib.backend.exception.StorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${supabase.storage.bucket:documents}")
    private String bucket;

    private final RestClient restClient;

    private String authHeader() {
        return "Bearer " + serviceRoleKey;
    }

    public void uploadFile(String storagePath, byte[] content, String contentType) {
        try {
            restClient.post()
                    .uri(supabaseUrl + "/storage/v1/object/" + bucket + "/" + storagePath)
                    .header("Authorization", authHeader())
                    .header("x-upsert", "true")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(content)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Uploaded file to storage: {}", storagePath);
        } catch (Exception ex) {
            throw new StorageException("Failed to upload file: " + storagePath, ex);
        }
    }

    public byte[] downloadFile(String storagePath) {
        try {
            byte[] bytes = restClient.get()
                    .uri(supabaseUrl + "/storage/v1/object/" + bucket + "/" + storagePath)
                    .header("Authorization", authHeader())
                    .retrieve()
                    .body(byte[].class);
            if (bytes == null) throw new StorageException("Empty response for: " + storagePath, null);
            return bytes;
        } catch (StorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new StorageException("Failed to download file: " + storagePath, ex);
        }
    }

    @SuppressWarnings("unchecked")
    public String generateSignedUrl(String storagePath, int expiresInSeconds) {
        try {
            Map<String, Object> response = restClient.post()
                    .uri(supabaseUrl + "/storage/v1/object/sign/" + bucket + "/" + storagePath)
                    .header("Authorization", authHeader())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", expiresInSeconds))
                    .retrieve()
                    .body(Map.class);

            if (response == null || !response.containsKey("signedURL")) {
                throw new StorageException("No signedURL in response for: " + storagePath, null);
            }
            return supabaseUrl + response.get("signedURL");
        } catch (StorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new StorageException("Failed to generate signed URL: " + storagePath, ex);
        }
    }

    public void deleteFile(String storagePath) {
        try {
            restClient.method(HttpMethod.DELETE)
                    .uri(supabaseUrl + "/storage/v1/object/" + bucket)
                    .header("Authorization", authHeader())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("prefixes", List.of(storagePath)))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to delete file from storage: {}", storagePath, ex);
        }
    }
}
