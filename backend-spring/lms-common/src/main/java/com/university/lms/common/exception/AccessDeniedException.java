package com.university.lms.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when access to a resource is forbidden.
 */
public class AccessDeniedException extends LmsException {
    public AccessDeniedException(String message) {
        super(message, "ACCESS_DENIED", HttpStatus.FORBIDDEN);
    }

    public AccessDeniedException() {
        super("Access denied to this resource", "ACCESS_DENIED", HttpStatus.FORBIDDEN);
    }
}

