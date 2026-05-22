package com.nib.backend.service;

import com.nib.backend.dto.UserSettingsRequest;
import com.nib.backend.model.User;
import com.nib.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public void updateSettings(User user, UserSettingsRequest request) {
        user.setSettings(request.settings());
        userRepository.save(user);
    }
}
