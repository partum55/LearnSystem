package com.university.lms.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when optimistic-lock or state conflicts occur.
 */
public class ConflictException extends LmsException {

    private static final long serialVersionUID = 1L;
    private static final String ERROR_CODE = "CONFLICT";

    public ConflictException(String message) {
        super(message, ERROR_CODE, HttpStatus.CONFLICT);
    }

    public ConflictException(String message, Throwable cause) {
        super(message, ERROR_CODE, HttpStatus.CONFLICT, cause);
    }
}
