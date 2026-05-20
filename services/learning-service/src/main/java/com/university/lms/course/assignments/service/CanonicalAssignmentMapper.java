package com.university.lms.course.assignments.service;

import com.university.lms.course.assignments.dto.AssignmentDetailDto;
import com.university.lms.course.assignments.dto.AssignmentListItemDto;
import com.university.lms.course.assignments.dto.GradePreviewDto;
import com.university.lms.course.assignments.dto.StudentAssignmentStateDto;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizAttempt;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.submission.domain.Submission;
import java.util.HashMap;
import java.util.List;
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
        AssignmentTypeMapper.toCanonical(assignment.getAssignmentType()),
        assignment.getPosition() == null ? 0 : assignment.getPosition(),
        assignment.getMaxPoints(),
        assignment.getDueDate(),
        Boolean.TRUE.equals(assignment.getIsPublished()) ? "visible" : "hidden",
        toGradePreview(grade));
  }

  public AssignmentDetailDto toDetail(
      Assignment assignment,
      Quiz quiz,
      Submission submission,
      QuizAttempt latestAttempt,
      GradebookEntry grade,
      long attemptsUsed) {
    String type = AssignmentTypeMapper.toCanonical(assignment.getAssignmentType());
    Integer attemptLimit = quiz == null ? null : quiz.getAttemptsAllowed();
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
        Boolean.TRUE.equals(assignment.getIsPublished()) ? "visible" : "hidden",
        settings(assignment, quiz),
        new StudentAssignmentStateDto(
            state(type, submission, latestAttempt, grade),
            submission == null ? null : submission.getId(),
            latestAttempt == null ? null : latestAttempt.getId(),
            submission == null ? null : submission.getSubmittedAt(),
            toGradePreview(grade),
            canSubmit(type, assignment, submission, attemptsUsed, attemptLimit),
            canEdit(assignment, submission),
            false,
            canResubmit(assignment, submission),
            "quiz".equals(type) && (attemptLimit == null || attemptsUsed < attemptLimit),
            "quiz".equals(type) ? Math.toIntExact(attemptsUsed) : null,
            attemptLimit));
  }

  public Map<String, Object> settings(Assignment assignment, Quiz quiz) {
    String type = AssignmentTypeMapper.toCanonical(assignment.getAssignmentType());
    Map<String, Object> settings = new HashMap<>();
    settings.put("allowLateSubmission", Boolean.TRUE.equals(assignment.getAllowLateSubmission()));
    settings.put("availableFrom", assignment.getAvailableFrom());
    settings.put("availableUntil", assignment.getAvailableUntil());
    settings.put("allowResubmission", true);
    switch (type) {
      case "file_submission" -> {
        settings.put("allowedFileTypes", safeList(assignment.getAllowedFileTypes()));
        settings.put("maxFiles", assignment.getMaxFiles());
        settings.put("maxFileSizeMb", assignment.getMaxFileSize() == null ? null : assignment.getMaxFileSize() / 1024 / 1024);
        settings.put("allowEditAfterSubmit", true);
        settings.put("allowDeleteAfterSubmit", false);
      }
      case "rte_submission" -> {
        settings.put("minWords", nestedSetting(assignment, "minWords"));
        settings.put("maxWords", nestedSetting(assignment, "maxWords"));
        settings.put("allowEditAfterSubmit", true);
      }
      case "form" -> {
        settings.put("fields", nestedSetting(assignment, "fields"));
        settings.put("allowEditAfterSubmit", true);
      }
      case "quiz" -> {
        settings.put("attemptLimit", quiz == null ? null : quiz.getAttemptsAllowed());
        settings.put("timeLimitMinutes", quiz == null || !Boolean.TRUE.equals(quiz.getTimerEnabled()) ? null : quiz.getTimeLimit());
        settings.put("canReviewAttempts", true);
        settings.put("showCorrectAnswers", quiz != null && quiz.canShowCorrectAnswers());
        settings.put("showScoreAfterSubmit", true);
        settings.put("shuffleQuestions", quiz != null && Boolean.TRUE.equals(quiz.getShuffleQuestions()));
        settings.put("gradingMode", quiz == null ? null : quiz.getAttemptScorePolicy().name().toLowerCase());
      }
      case "vpl" -> {
        settings.put("language", assignment.getProgrammingLanguage());
        settings.put("templateCode", assignment.getStarterCode());
        settings.put("visibleTests", assignment.getTestCases());
        settings.put("hiddenTestsReference", nestedSetting(assignment, "hiddenTestsReference"));
        settings.put("runtime", nestedSetting(assignment, "runtime"));
        settings.put("timeLimit", nestedSetting(assignment, "timeLimit"));
        settings.put("memoryLimit", nestedSetting(assignment, "memoryLimit"));
        settings.put("gradingMode", Boolean.TRUE.equals(assignment.getAutoGradingEnabled()) ? "auto" : "manual");
      }
      case "seminar" -> {
        settings.put("requiresSubmission", false);
        settings.put("manualGradeOnly", true);
      }
      default -> {
      }
    }
    return settings;
  }

  public GradePreviewDto toGradePreview(GradebookEntry entry) {
    if (entry == null) {
      return null;
    }
    return new GradePreviewDto(
        entry.getFinalScore(),
        entry.getMaxScore(),
        entry.getStatus().name().toLowerCase(),
        entry.getNotes());
  }

  private List<String> safeList(List<String> values) {
    return values == null ? List.of() : values;
  }

  private Object nestedSetting(Assignment assignment, String key) {
    Map<String, Object> config = Optional.ofNullable(assignment.getExternalToolConfig()).orElse(Map.of());
    Object canonicalSettings = config.get("canonicalSettings");
    if (canonicalSettings instanceof Map<?, ?> map) {
      return map.get(key);
    }
    Map<String, Object> vplConfig = Optional.ofNullable(assignment.getVplConfig()).orElse(Map.of());
    return vplConfig.get(key);
  }

  private String state(
      String type,
      Submission submission,
      QuizAttempt latestAttempt,
      GradebookEntry grade) {
    if (grade != null && grade.getFinalScore() != null) {
      return "graded";
    }
    if ("seminar".equals(type)) {
      return "waiting_for_teacher_grade";
    }
    if ("quiz".equals(type)) {
      if (latestAttempt == null) {
        return "not_started";
      }
      return latestAttempt.isSubmitted() ? "submitted" : "in_progress";
    }
    if (submission == null) {
      return "not_submitted";
    }
    return submission.getStatus().toLowerCase();
  }

  private boolean canSubmit(
      String type,
      Assignment assignment,
      Submission submission,
      long attemptsUsed,
      Integer attemptLimit) {
    if ("seminar".equals(type) || "quiz".equals(type)) {
      return false;
    }
    if (!assignment.acceptsLateSubmission()) {
      return false;
    }
    return submission == null || canResubmit(assignment, submission);
  }

  private boolean canEdit(Assignment assignment, Submission submission) {
    return submission != null
        && submission.getPublishedAt() == null
        && assignment.acceptsLateSubmission();
  }

  private boolean canResubmit(Assignment assignment, Submission submission) {
    return submission != null
        && submission.getPublishedAt() == null
        && assignment.acceptsLateSubmission();
  }
}
