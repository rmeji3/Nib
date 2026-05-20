package com.nib.backend.service;

import com.nib.backend.dto.TestRequest;
import com.nib.backend.dto.TestResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class TestService implements TestIService {
    @Override
    public TestResponse processTestRequest(TestRequest request) {
        String message = "Hello, " + request.name() + "! This is a test response.";
        String greeting = "Welcome to Nib!";
        LocalDateTime timestamp = LocalDateTime.now();
        return new TestResponse(message, greeting, timestamp);
    }

    @Override
    public TestResponse sayHello(TestRequest request) {
        String message = "Hello, " + request.name() + "! This is a test response.";
        String greeting = "Welcome to Nib!";
        LocalDateTime timestamp = LocalDateTime.now();
        return new TestResponse(message, greeting, timestamp);
    }

}