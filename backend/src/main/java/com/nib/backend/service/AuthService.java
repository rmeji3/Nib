package com.nib.backend.service;

import com.nib.backend.dto.AuthRequest;
import com.nib.backend.dto.AuthResponse;
import com.nib.backend.dto.RegisterRequest;
import com.nib.backend.model.User;
import com.nib.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // In a real application, check if email already exists
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }

        var user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();
        
        userRepository.save(user);
        
        var jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken, user.getId(), user.getEmail(), user.getName());
    }

    public AuthResponse authenticate(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );
        
        var user = userRepository.findByEmail(request.email())
                .orElseThrow();
                
        var jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken, user.getId(), user.getEmail(), user.getName());
    }
}
