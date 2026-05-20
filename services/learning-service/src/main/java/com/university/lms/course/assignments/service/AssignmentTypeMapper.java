package com.university.lms.course.assignments.service;

import com.university.lms.course.common.error.ApiException;
import java.util.Locale;

public final class AssignmentTypeMapper {
  private AssignmentTypeMapper() {}

  public static String toCanonical(String legacyType) {
    if (legacyType == null) {
      return "file_submission";
    }
    return switch (legacyType.toUpperCase(Locale.ROOT)) {
      case "FILE_UPLOAD" -> "file_submission";
      case "TEXT" -> "rte_submission";
      case "QUIZ" -> "quiz";
      case "VIRTUAL_LAB", "CODE" -> "vpl";
      case "SEMINAR", "MANUAL_GRADE" -> "seminar";
      case "URL", "EXTERNAL" -> "form";
      default -> legacyType.toLowerCase(Locale.ROOT);
    };
  }

  public static String toLegacy(String canonicalType) {
    if (canonicalType == null) {
      throw ApiException.badRequest("INVALID_ASSIGNMENT_TYPE", "Assignment type is required");
    }
    return switch (canonicalType.toLowerCase(Locale.ROOT)) {
      case "file_submission" -> "FILE_UPLOAD";
      case "rte_submission" -> "TEXT";
      case "quiz" -> "QUIZ";
      case "form" -> "URL";
      case "vpl" -> "VIRTUAL_LAB";
      case "seminar" -> "SEMINAR";
      default -> throw ApiException.badRequest(
          "INVALID_ASSIGNMENT_TYPE", "Unsupported assignment type: " + canonicalType);
    };
  }

  public static boolean requiresStudentSubmission(String canonicalType) {
    return !"seminar".equals(canonicalType) && !"quiz".equals(canonicalType);
  }
}
