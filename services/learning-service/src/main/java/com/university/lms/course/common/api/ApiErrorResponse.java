package com.university.lms.course.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(
    String message,
    String code,
    Map<String, String> fieldErrors
) {
  public static ApiErrorResponse of(String message, String code) {
    return new ApiErrorResponse(message, code, Map.of());
  }

  public static ApiErrorResponse validation(Map<String, String> fieldErrors) {
    return new ApiErrorResponse("Validation failed", "VALIDATION_ERROR", fieldErrors);
  }
}
