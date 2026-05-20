package com.university.lms.course.submissions.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

public record SubmissionRequest(
    String text,
    String url,
    String programmingLanguage,
    String code,
    String executionResultReference,
    List<FileSubmissionItemDto> files,
    Map<String, Object> answers
) {
  public void requireText() {
    if (text == null || text.isBlank()) {
      throw new IllegalArgumentException("Submission text is required");
    }
  }

  public record FileSubmissionItemDto(
      @NotBlank String fileName,
      @NotBlank String fileUrl,
      String contentType,
      Long fileSize
  ) {}
}
