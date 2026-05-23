package com.university.lms.course.assignments.service;

import com.university.lms.course.assignments.dto.AssignmentDetailDto;
import com.university.lms.course.assignments.dto.AssignmentListItemDto;
import com.university.lms.course.assignments.dto.GradePreviewDto;
import com.university.lms.course.assignments.dto.StudentAssignmentStateDto;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.AssignmentStatus;
import com.university.lms.course.assessment.domain.AssignmentType;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.submission.domain.Submission;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CanonicalAssignmentMapper {

  public AssignmentListItemDto toListItem(Assignment assignment, GradebookEntry grade) {
    return new AssignmentListItemDto(
        assignment.getId(),
        assignment.getModuleId(),
        assignment.getTitle(),
        assignment.getAssignmentType(),
        assignment.getPosition() == null ? 0 : assignment.getPosition(),
        assignment.getMaxPoints(),
        assignment.getDueDate(),
        assignment.getStatus().name(),
        toPublishedGradePreview(grade));
  }

  public AssignmentDetailDto toDetail(
      Assignment assignment,
      Submission submission,
      GradebookEntry grade,
      long attemptsUsed) {
    AssignmentType type = assignment.getAssignmentType();
    Integer attemptLimit = integerSetting(assignment, "attemptLimit");
    return new AssignmentDetailDto(
        assignment.getId(),
        assignment.getCourseId(),
        assignment.getModuleId(),
        type,
        assignment.getTitle(),
        assignment.getDescription(),
        assignment.getInstructions(),
        assignment.getMaxPoints(),
        assignment.getDueDate(),
        assignment.getStatus().name(),
        settings(assignment),
        new StudentAssignmentStateDto(
            state(type, submission, grade),
            submission == null ? null : submission.getId(),
            null,
            submission == null ? null : submission.getSubmittedAt(),
            toPublishedGradePreview(grade),
            canSubmit(type, assignment, submission, attemptsUsed, attemptLimit),
            canEdit(assignment, submission),
            canDelete(assignment, submission),
            canResubmit(assignment, submission),
            type == AssignmentType.QUIZ && (attemptLimit == null || attemptsUsed < attemptLimit),
            type == AssignmentType.QUIZ ? Math.toIntExact(attemptsUsed) : null,
            attemptLimit));
  }

  public Map<String, Object> settings(Assignment assignment) {
    AssignmentType type = assignment.getAssignmentType();
    Map<String, Object> settings = new HashMap<>();
    settings.put("type", type);
    settings.put("schemaVersion", Optional.ofNullable(setting(assignment, "schemaVersion")).orElse(1));
    settings.put("allowLateSubmission", Boolean.TRUE.equals(assignment.getAllowLateSubmission()));
    settings.put("availableFrom", assignment.getAvailableFrom());
    settings.put("availableUntil", assignment.getAvailableUntil());
    settings.put("allowResubmission", booleanSetting(assignment, "allowResubmission", true));
    switch (type) {
      case FILE_SUBMISSION -> {
        settings.put("allowedFileTypes", setting(assignment, "allowedFileTypes"));
        settings.put("maxFiles", setting(assignment, "maxFiles"));
        settings.put("maxFileSizeMb", setting(assignment, "maxFileSizeMb"));
        settings.put("allowEditAfterSubmit", booleanSetting(assignment, "allowEditAfterSubmit", true));
        settings.put("allowDeleteAfterSubmit", booleanSetting(assignment, "allowDeleteAfterSubmit", false));
      }
      case TEXT_SUBMISSION -> {
        settings.put("minWords", setting(assignment, "minWords"));
        settings.put("maxWords", setting(assignment, "maxWords"));
        settings.put("allowEditAfterSubmit", booleanSetting(assignment, "allowEditAfterSubmit", true));
      }
      case FORM -> {
        settings.put("fields", setting(assignment, "fields"));
        settings.put("allowEditAfterSubmit", booleanSetting(assignment, "allowEditAfterSubmit", true));
      }
      case QUIZ -> {
        settings.put("attemptLimit", setting(assignment, "attemptLimit"));
        settings.put("timeLimitMinutes", setting(assignment, "timeLimitMinutes"));
        settings.put("canReviewAttempts", booleanSetting(assignment, "canReviewAttempts", true));
        settings.put("showCorrectAnswers", booleanSetting(assignment, "showCorrectAnswers", false));
        settings.put("showScoreAfterSubmit", booleanSetting(assignment, "showScoreAfterSubmit", true));
        settings.put("shuffleQuestions", booleanSetting(assignment, "shuffleQuestions", false));
        settings.put("gradingMode", setting(assignment, "gradingMode"));
      }
      case VPL -> {
        settings.put("language", setting(assignment, "language"));
        settings.put("templateCode", setting(assignment, "templateCode"));
        settings.put("visibleTests", setting(assignment, "visibleTests"));
        settings.put("hiddenTestsReference", setting(assignment, "hiddenTestsReference"));
        settings.put("runtime", setting(assignment, "runtime"));
        settings.put("timeLimit", setting(assignment, "timeLimit"));
        settings.put("memoryLimit", setting(assignment, "memoryLimit"));
        settings.put("gradingMode", Optional.ofNullable(setting(assignment, "gradingMode")).orElse("manual"));
      }
      case SEMINAR -> {
        settings.put("requiresSubmission", false);
        settings.put("manualGradeOnly", true);
      }
    }
    return settings;
  }

  public GradePreviewDto toPublishedGradePreview(GradebookEntry entry) {
    if (entry == null || !entry.isPublishedGrade() || entry.getPublishedFinalScore() == null) {
      return null;
    }
    return new GradePreviewDto(
        entry.getPublishedFinalScore(),
        entry.getMaxScore(),
        "PUBLISHED",
        entry.getPublishedFinalComment());
  }

  private Object setting(Assignment assignment, String key) {
    return Optional.ofNullable(assignment.getSettings()).orElse(Map.of()).get(key);
  }

  private Integer integerSetting(Assignment assignment, String key) {
    Object value = setting(assignment, key);
    return value instanceof Number number ? number.intValue() : null;
  }

  private boolean booleanSetting(Assignment assignment, String key, boolean defaultValue) {
    Object value = setting(assignment, key);
    return value instanceof Boolean bool ? bool : defaultValue;
  }

  private String state(
      AssignmentType type,
      Submission submission,
      GradebookEntry grade) {
    if (grade != null && grade.isPublishedGrade() && grade.getPublishedFinalScore() != null) {
      return "graded";
    }
    if (type == AssignmentType.SEMINAR) {
      return "waiting_for_teacher_grade";
    }
    if (type == AssignmentType.QUIZ) {
      return grade == null ? "not_submitted" : "submitted";
    }
    if (submission == null) return "not_submitted";
    return submission.getStatus().name();
  }

  private boolean canSubmit(
      AssignmentType type,
      Assignment assignment,
      Submission submission,
      long attemptsUsed,
      Integer attemptLimit) {
    if (type == AssignmentType.SEMINAR || type == AssignmentType.QUIZ) return false;
    if (!assignment.acceptsLateSubmission()) return false;
    return submission == null || canResubmit(assignment, submission);
  }

  private boolean canEdit(Assignment assignment, Submission submission) {
    return submission != null
        && submission.getPublishedAt() == null
        && assignment.acceptsLateSubmission()
        && booleanSetting(assignment, "allowEditAfterSubmit", true);
  }

  private boolean canDelete(Assignment assignment, Submission submission) {
    return submission != null
        && submission.getPublishedAt() == null
        && assignment.acceptsLateSubmission()
        && booleanSetting(assignment, "allowDeleteAfterSubmit", false);
  }

  private boolean canResubmit(Assignment assignment, Submission submission) {
    return submission != null
        && submission.getPublishedAt() == null
        && assignment.acceptsLateSubmission()
        && booleanSetting(assignment, "allowResubmission", true);
  }
}
