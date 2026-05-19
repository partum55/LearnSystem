package com.university.lms.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when a requested resource is not found.
 */
public class ResourceNotFoundException extends LmsException {

    private static final long serialVersionUID = 1L;
    private static final String ERROR_CODE = "RESOURCE_NOT_FOUND";

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(
            String.format("%s not found with %s: %s", resourceName, fieldName, fieldValue),
            ERROR_CODE,
            HttpStatus.NOT_FOUND
        );
    }

    public ResourceNotFoundException(String resourceName, String identifier) {
        super(
            String.format("%s not found with identifier: %s", resourceName, identifier),
            ERROR_CODE,
            HttpStatus.NOT_FOUND
        );
    }

    public ResourceNotFoundException(String message) {
        super(message, ERROR_CODE, HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, ERROR_CODE, HttpStatus.NOT_FOUND, cause);
    }
}
