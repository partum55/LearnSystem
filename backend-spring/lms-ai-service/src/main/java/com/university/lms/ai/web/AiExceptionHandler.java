package com.university.lms.ai.web;

import com.university.lms.ai.exception.AiContentValidationException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
@Slf4j
public class AiExceptionHandler {

    @ExceptionHandler(AiContentValidationException.class)
    public ResponseEntity<Map<String, Object>> handleAiValidation(AiContentValidationException ex) {
        log.warn("AI validation error for {}: {}", ex.getContentType(), ex.getErrors());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "error", "AI_VALIDATION_FAILED",
            "contentType", ex.getContentType(),
            "messages", ex.getErrors()
        ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("Constraint violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "error", "REQUEST_VALIDATION_FAILED",
            "message", ex.getMessage()
        ));
    }
}
