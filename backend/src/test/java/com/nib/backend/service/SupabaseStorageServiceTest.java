package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class SupabaseStorageServiceTest {

    @Test
    void treatsInvalidMimeTypeAsNonRetryableUploadFailure() {
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                HttpHeaders.EMPTY,
                """
                {"statusCode":"415","error":"invalid_mime_type","message":"mime type image/png is not supported"}
                """.getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8
        );

        assertThat(SupabaseStorageService.isNonRetryableUploadFailure(exception)).isTrue();
    }

    @Test
    void keepsRateLimitUploadFailuresRetryable() {
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too Many Requests",
                HttpHeaders.EMPTY,
                new byte[0],
                StandardCharsets.UTF_8
        );

        assertThat(SupabaseStorageService.isNonRetryableUploadFailure(exception)).isFalse();
    }
}
