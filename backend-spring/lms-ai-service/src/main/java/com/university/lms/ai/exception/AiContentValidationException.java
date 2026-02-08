package com.university.lms.ai.exception;

import java.util.List;

public class AiContentValidationException extends RuntimeException {

  private final String contentType;
  private final List<String> errors;

  public AiContentValidationException(String contentType, List<String> errors) {
    super("AI content validation failed for " + contentType);
    this.contentType = contentType;
    this.errors = errors;
  }

  public String getContentType() {
    return contentType;
  }

  public List<String> getErrors() {
    return errors;
  }
}
