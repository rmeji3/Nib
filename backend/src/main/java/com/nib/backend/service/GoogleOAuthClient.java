package com.nib.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Exchanges a Google authorization code (from the frontend popup auth-code flow) for
 * the user's profile. The code is exchanged server-to-server using the client secret,
 * so the returned id_token comes directly from Google over TLS and is trusted.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleOAuthClient {

    private final ObjectMapper objectMapper;

    @Value("${google.client-id:}")
    private String clientId;

    @Value("${google.client-secret:}")
    private String clientSecret;

    private final RestClient restClient = RestClient.create();

    /** Verified identity extracted from the Google id_token. */
    public record GoogleProfile(String sub, String email, boolean emailVerified, String name, String picture) {}

    public GoogleProfile exchangeCode(String code) {
        if (!StringUtils.hasText(clientId) || !StringUtils.hasText(clientSecret)) {
            throw new IllegalStateException("Google OAuth is not configured on the server.");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        // 'postmessage' is the redirect_uri used by the GIS popup auth-code flow.
        form.add("redirect_uri", "postmessage");
        form.add("grant_type", "authorization_code");

        try {
            String body = restClient.post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);

            JsonNode token = objectMapper.readTree(body);
            String idToken = token.path("id_token").asText(null);
            if (idToken == null) {
                throw new IllegalArgumentException("Google did not return an id_token.");
            }
            return parseIdToken(idToken);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google code exchange failed: {}", e.getMessage());
            throw new IllegalArgumentException("Could not complete Google sign-in. Please try again.");
        }
    }

    private GoogleProfile parseIdToken(String idToken) throws Exception {
        String[] parts = idToken.split("\\.");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Malformed Google id_token.");
        }
        byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
        JsonNode claims = objectMapper.readTree(new String(payload, StandardCharsets.UTF_8));

        // Defence-in-depth: the token came from a trusted direct exchange, but confirm
        // it was actually issued for our client.
        String aud = claims.path("aud").asText("");
        if (!clientId.equals(aud)) {
            throw new IllegalArgumentException("Google token audience mismatch.");
        }

        return new GoogleProfile(
                claims.path("sub").asText(),
                claims.path("email").asText(),
                claims.path("email_verified").asBoolean(false),
                claims.path("name").asText(claims.path("email").asText()),
                claims.path("picture").asText(null)
        );
    }
}
