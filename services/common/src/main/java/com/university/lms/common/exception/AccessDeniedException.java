package com.university.lms.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when access to a resource is forbidden.
 */
public class AccessDeniedException extends LmsException {

    private static final long serialVersionUID = 1L;
    private static final String ERROR_CODE = "ACCESS_DENIED";
    private static final String DEFAULT_MESSAGE = "Access denied to this resource";

    public AccessDeniedException(String message) {
        super(message, ERROR_CODE, HttpStatus.FORBIDDEN);
    }

    public AccessDeniedException() {
        super(DEFAULT_MESSAGE, ERROR_CODE, HttpStatus.FORBIDDEN);
    }

    public AccessDeniedException(String message, Throwable cause) {
        super(message, ERROR_CODE, HttpStatus.FORBIDDEN, cause);
    }
}
