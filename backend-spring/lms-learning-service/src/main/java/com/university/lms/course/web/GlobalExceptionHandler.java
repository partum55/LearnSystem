package com.university.lms.course.web;

import com.university.lms.common.dto.ErrorResponse;
import com.university.lms.common.exception.ConflictException;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/** Global exception handler for Learning Service REST API. */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
      ResourceNotFoundException ex, WebRequest request) {

    log.error("Resource not found: {}", ex.getMessage());
    return buildErrorResponse("NOT_FOUND", ex.getMessage(), HttpStatus.NOT_FOUND, request);
  }

  @ExceptionHandler(ValidationException.class)
  public ResponseEntity<ErrorResponse> handleValidationException(
      ValidationException ex, WebRequest request) {

    log.error("Validation error: {}", ex.getMessage());
    return buildErrorResponse("VALIDATION_ERROR", ex.getMessage(), HttpStatus.BAD_REQUEST, request);
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ErrorResponse> handleConflictException(
      ConflictException ex, WebRequest request) {

    log.warn("Conflict error: {}", ex.getMessage());
    return buildErrorResponse("CONFLICT", ex.getMessage(), HttpStatus.CONFLICT, request);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, WebRequest request) {

    log.error("Validation error: {}", ex.getMessage());

    Map<String, String> errors = new HashMap<>();
    ex.getBindingResult().getAllErrors().forEach(error -> addValidationError(errors, error));

    return buildErrorResponse(
        "VALIDATION_ERROR", "Invalid input parameters", HttpStatus.BAD_REQUEST, request, errors);
  }

  @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleAuthenticationCredentialsNotFoundException(
      AuthenticationCredentialsNotFoundException ex, WebRequest request) {

    log.warn("Authentication required: {}", ex.getMessage());
    return buildErrorResponse("AUTHENTICATION_REQUIRED", ex.getMessage(), HttpStatus.UNAUTHORIZED, request);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDeniedException(
      AccessDeniedException ex, WebRequest request) {

    log.warn("Access denied: {}", ex.getMessage());
    return buildErrorResponse("ACCESS_DENIED", ex.getMessage(), HttpStatus.FORBIDDEN, request);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
      IllegalArgumentException ex, WebRequest request) {

    log.error("Illegal argument: {}", ex.getMessage());
    return buildErrorResponse("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, WebRequest request) {

    log.error("Unexpected error occurred", ex);
    return buildErrorResponse(
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred. Please try again later.",
        HttpStatus.INTERNAL_SERVER_ERROR,
        request);
  }

  private void addValidationError(Map<String, String> errors, ObjectError error) {
    String fieldName;
    if (error instanceof FieldError fieldError) {
      fieldName = fieldError.getField();
    } else {
      fieldName = error.getObjectName();
    }
    errors.put(fieldName, error.getDefaultMessage());
  }

  private ResponseEntity<ErrorResponse> buildErrorResponse(
      String code, String message, HttpStatus status, WebRequest request) {
    ErrorResponse error =
        ErrorResponse.of(code, message, request.getDescription(false).replace("uri=", ""), status.value());
    return ResponseEntity.status(status).body(error);
  }

  private ResponseEntity<ErrorResponse> buildErrorResponse(
      String code, String message, HttpStatus status, WebRequest request, Object details) {
    ErrorResponse error =
        ErrorResponse.of(
            code,
            message,
            request.getDescription(false).replace("uri=", ""),
            status.value(),
            details);
    return ResponseEntity.status(status).body(error);
  }
}
