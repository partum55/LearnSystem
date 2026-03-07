package com.university.lms.course.assessment.domain;

/**
 * Determines which quiz attempt is considered official for reporting.
 */
public enum AttemptScorePolicy {
  HIGHEST,
  LATEST,
  FIRST
}
