package com.nib.backend.controller;

import com.nib.backend.dto.UserSettingsRequest;
import com.nib.backend.model.User;
import com.nib.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PutMapping("/me/settings")
    public ResponseEntity<Void> updateSettings(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UserSettingsRequest request
    ) {
        userService.updateSettings(user, request);
        return ResponseEntity.ok().build();
    }
}
