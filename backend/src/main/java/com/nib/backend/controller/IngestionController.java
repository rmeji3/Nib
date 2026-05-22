package com.nib.backend.controller;

import com.nib.backend.dto.IngestionStatusResponse;
import com.nib.backend.model.User;
import com.nib.backend.service.IngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class IngestionController {

    private final IngestionService ingestionService;

    @GetMapping("/{id}/status")
    public ResponseEntity<IngestionStatusResponse> getStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(ingestionService.getStatus(id));
    }

    /** Manual re-trigger endpoint — useful for retrying failed jobs. */
    @PostMapping("/{id}/ingest")
    public ResponseEntity<IngestionStatusResponse> triggerIngestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        var job = ingestionService.createAndTrigger(id);
        return ResponseEntity.accepted().body(ingestionService.getStatus(id));
    }
}
