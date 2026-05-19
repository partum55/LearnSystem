package com.university.lms.ai.web;

import com.university.lms.ai.exception.AiContentValidationException;
import com.university.lms.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class AiExceptionHandler {

  @ExceptionHandler(AiContentValidationException.class)
  public ResponseEntity<ErrorResponse> handleAiValidation(
      AiContentValidationException ex, HttpServletRequest request) {
    log.warn("AI validation error for {}: {}", ex.getContentType(), ex.getErrors());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            ErrorResponse.of(
                "AI_VALIDATION_FAILED",
                "AI content validation failed",
                request.getRequestURI(),
                HttpStatus.BAD_REQUEST.value(),
                Map.of("contentType", ex.getContentType(), "messages", ex.getErrors())));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ErrorResponse> handleConstraintViolation(
      ConstraintViolationException ex, HttpServletRequest request) {
    log.warn("Constraint violation: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            ErrorResponse.of(
                "REQUEST_VALIDATION_FAILED",
                ex.getMessage(),
                request.getRequestURI(),
                HttpStatus.BAD_REQUEST.value()));
  }
}
