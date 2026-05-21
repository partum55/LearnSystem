package com.university.lms.course.materials.entity;

import java.util.Locale;

public enum LearningItemStatus {
  VISIBLE,
  HIDDEN,
  ARCHIVED;

  public static LearningItemStatus fromVisible(Boolean visible) {
    return Boolean.TRUE.equals(visible) ? VISIBLE : HIDDEN;
  }

  public String apiValue() {
    return switch (this) {
      case VISIBLE -> "visible";
      case HIDDEN -> "hidden";
      case ARCHIVED -> "archived";
    };
  }

  public static LearningItemStatus fromApiValue(String value) {
    if (value == null || value.isBlank()) {
      return HIDDEN;
    }
    return switch (value.trim().toLowerCase(Locale.ROOT)) {
      case "visible", "published" -> VISIBLE;
      case "hidden", "draft" -> HIDDEN;
      case "archived" -> ARCHIVED;
      default -> HIDDEN;
    };
  }
}
