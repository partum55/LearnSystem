package com.university.lms.course.assessment.domain;

public enum AssignmentType {
  FILE_SUBMISSION,
  TEXT_SUBMISSION,
  QUIZ,
  FORM,
  VPL,
  SEMINAR;

  public boolean requiresStudentSubmission() {
    return this != SEMINAR && this != QUIZ;
  }
}
