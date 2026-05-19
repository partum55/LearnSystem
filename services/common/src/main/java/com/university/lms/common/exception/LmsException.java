package com.university.lms.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Objects;

/**
 * Base exception class for all LMS business exceptions.
 */
@Getter
public class LmsException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String errorCode;
    private final HttpStatus httpStatus;

    public LmsException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode must not be null");
        this.httpStatus = Objects.requireNonNull(httpStatus, "httpStatus must not be null");
    }

    public LmsException(String message, String errorCode, HttpStatus httpStatus, Throwable cause) {
        super(message, cause);
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode must not be null");
        this.httpStatus = Objects.requireNonNull(httpStatus, "httpStatus must not be null");
    }

    public int getStatusCode() {
        return httpStatus.value();
    }
}
