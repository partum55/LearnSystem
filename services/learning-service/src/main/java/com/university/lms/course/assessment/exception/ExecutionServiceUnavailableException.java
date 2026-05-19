package com.university.lms.course.assessment.exception;

/**
 * Exception thrown when execution service is unavailable.
 */
public class ExecutionServiceUnavailableException extends RuntimeException {

    public ExecutionServiceUnavailableException(String message) {
        super(message);
    }

    public ExecutionServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}