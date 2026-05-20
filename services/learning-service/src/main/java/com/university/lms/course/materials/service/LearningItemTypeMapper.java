package com.university.lms.course.materials.service;

import com.university.lms.course.common.error.ApiException;
import java.util.Locale;

final class LearningItemTypeMapper {
  private LearningItemTypeMapper() {}

  static String toCanonical(String legacyType) {
    if (legacyType == null) {
      return "file";
    }
    return switch (legacyType.toUpperCase(Locale.ROOT)) {
      case "PDF", "SLIDE" -> "pdf";
      case "LINK" -> "link";
      case "VIDEO" -> "video";
      case "TEXT", "CODE" -> "rte";
      default -> "file";
    };
  }

  static String toLegacy(String canonicalType) {
    if (canonicalType == null) {
      throw ApiException.badRequest("INVALID_LEARNING_ITEM_TYPE", "Learning item type is required");
    }
    return switch (canonicalType.toLowerCase(Locale.ROOT)) {
      case "pdf" -> "PDF";
      case "link" -> "LINK";
      case "video" -> "VIDEO";
      case "file" -> "OTHER";
      case "rte" -> "TEXT";
      case "lesson" -> "LESSON";
      default -> throw ApiException.badRequest(
          "INVALID_LEARNING_ITEM_TYPE", "Unsupported learning item type: " + canonicalType);
    };
  }
}
