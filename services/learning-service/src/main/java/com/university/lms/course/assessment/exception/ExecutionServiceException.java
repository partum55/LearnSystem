package com.university.lms.course.assessment.exception;

/**
 * Exception thrown when execution service returns an error.
 */
public class ExecutionServiceException extends RuntimeException {

    public ExecutionServiceException(String message) {
        super(message);
    }

    public ExecutionServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}