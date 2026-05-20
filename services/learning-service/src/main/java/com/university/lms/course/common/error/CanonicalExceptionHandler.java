package com.university.lms.course.common.error;

import com.university.lms.course.common.api.ApiErrorResponse;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.university.lms.course")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CanonicalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiErrorResponse> handleApiException(ApiException ex) {
    return ResponseEntity
        .status(ex.status())
        .body(ApiErrorResponse.of(ex.getMessage(), ex.code()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    Map<String, String> fields = new HashMap<>();
    for (FieldError error : ex.getBindingResult().getFieldErrors()) {
      fields.put(error.getField(), error.getDefaultMessage());
    }
    return ResponseEntity.badRequest().body(ApiErrorResponse.validation(fields));
  }

  @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleAuthentication(
      AuthenticationCredentialsNotFoundException ex) {
    return ResponseEntity
        .status(401)
        .body(ApiErrorResponse.of(ex.getMessage(), "UNAUTHENTICATED"));
  }
}
