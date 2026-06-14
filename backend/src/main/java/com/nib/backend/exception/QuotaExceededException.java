package com.nib.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.PAYMENT_REQUIRED) // 402 status code
public class QuotaExceededException extends RuntimeException {
    
    private final String limitType;
    private final String tier;

    public QuotaExceededException(String message, String limitType, String tier) {
        super(message);
        this.limitType = limitType;
        this.tier = tier;
    }

    public String getLimitType() {
        return limitType;
    }

    public String getTier() {
        return tier;
    }
}
