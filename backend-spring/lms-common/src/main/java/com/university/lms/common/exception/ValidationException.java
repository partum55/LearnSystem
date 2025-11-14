package com.university.lms.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown for validation errors.
 */
public class ValidationException extends LmsException {
    public ValidationException(String message) {
        super(message, "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
    }

    public ValidationException(String field, String message) {
        super(String.format("%s: %s", field, message), "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
    }
}

