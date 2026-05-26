package com.university.lms.ai.exception;

import com.university.lms.ai.domain.model.AiErrorCode;

public class AiException extends RuntimeException {
    private final AiErrorCode errorCode;

    public AiException(AiErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AiException(AiErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public AiErrorCode getErrorCode() {
        return errorCode;
    }
}
