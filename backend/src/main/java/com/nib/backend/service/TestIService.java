package com.nib.backend.service;

import com.nib.backend.dto.TestRequest;
import com.nib.backend.dto.TestResponse;

public interface TestIService {
    TestResponse processTestRequest(TestRequest request);
    TestResponse sayHello(TestRequest request);
}

