package com.university.lms.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown for validation errors.
 */
public class ValidationException extends LmsException {

    private static final long serialVersionUID = 1L;
    private static final String ERROR_CODE = "VALIDATION_ERROR";

    public ValidationException(String message) {
        super(message, ERROR_CODE, HttpStatus.BAD_REQUEST);
    }

    public ValidationException(String field, String message) {
        super(String.format("%s: %s", field, message), ERROR_CODE, HttpStatus.BAD_REQUEST);
    }

    public ValidationException(String message, Throwable cause) {
        super(message, ERROR_CODE, HttpStatus.BAD_REQUEST, cause);
    }
}
