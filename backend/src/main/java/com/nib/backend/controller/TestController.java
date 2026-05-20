package com.nib.backend.controller;

import com.nib.backend.dto.TestRequest;
import com.nib.backend.dto.TestResponse;
import com.nib.backend.service.TestIService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/test")
@Tag(name = "Test Controller", description = "Endpoints for backend structure demonstration")
public class TestController {

    private final TestIService testService;

    @GetMapping("/hello")
    @Operation(summary = "Get a simple greeting message")
    public ResponseEntity<String> getHello() {
        log.info("Received GET request at /api/v1/test/hello");
        TestRequest request = new TestRequest("Test User", "test@example.com");
        TestResponse response = testService.sayHello(request);
        return ResponseEntity.ok(response.message());
    }

    @PostMapping("/email")
    @Operation(summary = "Post name and email to receive a structured validation greeting")
    public ResponseEntity<TestResponse> greetUser(@Valid @RequestBody TestRequest request) {
        log.info("Received POST request at /api/v1/test/email with body: {}", request);
        TestResponse response = testService.processTestRequest(request);
        return ResponseEntity.ok(response);
    }
}
