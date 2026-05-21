package com.university.lms.course.materials.entity;

import com.university.lms.course.common.error.ApiException;
import java.util.Locale;

public enum LessonBlockType {
  TEXT,
  VIDEO,
  INLINE_QUIZ_QUESTION;

  public static LessonBlockType fromApiValue(String value) {
    if (value == null || value.isBlank()) {
      throw ApiException.badRequest("INVALID_LESSON_BLOCK_TYPE", "Lesson block type is required");
    }
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if ("INLINE_QUIZ".equals(normalized) || "QUIZ".equals(normalized)) {
      normalized = "INLINE_QUIZ_QUESTION";
    }
    try {
      return LessonBlockType.valueOf(normalized);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest(
          "INVALID_LESSON_BLOCK_TYPE", "Unsupported lesson block type: " + value);
    }
  }

  public String apiValue() {
    return name().toLowerCase(Locale.ROOT);
  }
}
