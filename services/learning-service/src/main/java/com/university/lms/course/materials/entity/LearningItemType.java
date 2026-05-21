package com.university.lms.course.materials.entity;

import com.university.lms.course.common.error.ApiException;
import java.util.Locale;

public enum LearningItemType {
  PDF,
  LINK,
  VIDEO,
  FILE,
  RTE,
  LESSON;

  public static LearningItemType fromApiValue(String value) {
    if (value == null || value.isBlank()) {
      throw ApiException.badRequest("INVALID_LEARNING_ITEM_TYPE", "Learning item type is required");
    }
    try {
      return LearningItemType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest(
          "INVALID_LEARNING_ITEM_TYPE", "Unsupported learning item type: " + value);
    }
  }

  public String apiValue() {
    return name().toLowerCase(Locale.ROOT);
  }
}
