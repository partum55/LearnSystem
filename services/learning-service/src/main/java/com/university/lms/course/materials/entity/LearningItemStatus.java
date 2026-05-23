package com.university.lms.course.materials.entity;

public enum LearningItemStatus {
  VISIBLE,
  HIDDEN,
  ARCHIVED;

  public static LearningItemStatus fromVisible(Boolean visible) {
    return Boolean.TRUE.equals(visible) ? VISIBLE : HIDDEN;
  }
}
