package com.university.lms.course.materials.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum LearningItemType {
  PDF,
  PRESENTATION,
  LINK,
  VIDEO,
  FILE,
  RTE,
  LESSON;

  @JsonCreator
  public static LearningItemType fromValue(String value) {
    if (value == null) {
      return null;
    }
    try {
      return LearningItemType.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Unknown learning item type: " + value);
    }
  }
}

