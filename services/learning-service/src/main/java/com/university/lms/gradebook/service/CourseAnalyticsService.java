package com.university.lms.gradebook.service;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.dto.CourseStatsDto;
import com.university.lms.gradebook.dto.StudentProgressDto;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseAnalyticsService {

  private static final Set<String> PENDING_GRADING_STATUSES =
      Set.of("SUBMITTED", "IN_REVIEW", "GRADED_DRAFT");
  private static final Set<String> COMPLETED_SUBMISSION_STATUSES =
      Set.of("SUBMITTED", "IN_REVIEW", "GRADED_DRAFT", "GRADED_PUBLISHED");
  private static final String ROLE_SUPERADMIN = "SUPERADMIN";

  private final CourseMemberRepository courseMemberRepository;
  private final AssignmentRepository assignmentRepository;
  private final SubmissionRepository submissionRepository;
  private final GradebookEntryRepository gradebookEntryRepository;
  private final JdbcTemplate jdbcTemplate;

  public CourseStatsDto getCourseStats(UUID courseId, UUID requesterId, String requesterRole) {
    validateCanViewCourseAnalytics(courseId, requesterId, requesterRole);

    List<UUID> studentIds = courseMemberRepository.findActiveStudentUserIdsByCourseId(courseId);
    if (studentIds.isEmpty()) {
      return new CourseStatsDto(0, 0, 0.0, 0.0, 0, 0);
    }

    List<Assignment> assignments = publishedAssignments(courseId);
    List<Submission> submissions = loadSubmissions(assignments);
    List<GradebookEntry> gradebookEntries = gradebookEntryRepository.findAllByCourseId(courseId);

    int activeStudents =
        (int)
            submissions.stream()
                .filter(submission -> isCompletedSubmission(submission.getStatus()))
                .map(Submission::getUserId)
                .distinct()
                .count();

    double averageGrade =
        gradebookEntries.stream()
            .map(GradebookEntry::getFinalScore)
            .filter(score -> score != null)
            .mapToDouble(score -> score.doubleValue())
            .average()
            .orElse(0.0);

    long gradableAssignments = assignments.stream().filter(Assignment::requiresSubmission).count();
    long completedSubmissionCount =
        submissions.stream().filter(submission -> isCompletedSubmission(submission.getStatus())).count();
    double completionRate =
        gradableAssignments == 0
            ? 0.0
            : (completedSubmissionCount * 100.0) / (studentIds.size() * gradableAssignments);

    int lateSubmissions = (int) submissions.stream().filter(submission -> Boolean.TRUE.equals(submission.getIsLate())).count();
    int pendingGrading =
        (int) submissions.stream().filter(submission -> isPendingGrading(submission.getStatus())).count();

    return new CourseStatsDto(
        studentIds.size(),
        activeStudents,
        averageGrade,
        Math.min(completionRate, 100.0),
        lateSubmissions,
        pendingGrading);
  }

  public List<StudentProgressDto> getStudentProgress(
      UUID courseId, UUID requesterId, String requesterRole) {
    validateCanViewCourseAnalytics(courseId, requesterId, requesterRole);

    List<UUID> studentIds = courseMemberRepository.findActiveStudentUserIdsByCourseId(courseId);
    if (studentIds.isEmpty()) {
      return List.of();
    }

    List<Assignment> assignments = publishedAssignments(courseId);
    Map<UUID, List<Submission>> submissionsByStudent = groupSubmissionsByStudent(assignments);
    Map<UUID, List<GradebookEntry>> gradesByStudent =
        gradebookEntryRepository.findAllByCourseId(courseId).stream()
            .collect(Collectors.groupingBy(GradebookEntry::getStudentId));
    Map<UUID, String> userNames = loadUserDisplayNames(studentIds);

    long gradableAssignments = assignments.stream().filter(Assignment::requiresSubmission).count();
    LocalDateTime now = LocalDateTime.now();

    List<StudentProgressDto> progress = new ArrayList<>();
    for (UUID studentId : studentIds) {
      List<Submission> studentSubmissions = submissionsByStudent.getOrDefault(studentId, List.of());
      long completedAssignments =
          studentSubmissions.stream()
              .filter(submission -> isCompletedSubmission(submission.getStatus()))
              .map(Submission::getAssignmentId)
              .distinct()
              .count();

      double progressPercent =
          gradableAssignments == 0 ? 0.0 : (completedAssignments * 100.0) / gradableAssignments;

      List<GradebookEntry> grades = gradesByStudent.getOrDefault(studentId, List.of());
      double averageGrade =
          grades.stream()
              .map(GradebookEntry::getFinalScore)
              .filter(score -> score != null)
              .mapToDouble(score -> score.doubleValue())
              .average()
              .orElse(0.0);

      LocalDateTime lastActive =
          studentSubmissions.stream()
              .map(this::lastActivityAt)
              .filter(activity -> activity != null)
              .max(Comparator.naturalOrder())
              .orElse(now);

      boolean struggling = averageGrade < 60.0 || progressPercent < 50.0;
      progress.add(
          new StudentProgressDto(
              studentId.toString(),
              userNames.getOrDefault(studentId, "Unknown User"),
              roundToOneDecimal(progressPercent),
              roundToOneDecimal(averageGrade),
              lastActive.toString(),
              struggling));
    }

    return progress.stream().sorted(Comparator.comparing(StudentProgressDto::name)).toList();
  }

  private void validateCanViewCourseAnalytics(
      UUID courseId, UUID requesterId, String requesterRole) {
    if (ROLE_SUPERADMIN.equalsIgnoreCase(requesterRole)) {
      return;
    }
    if (!courseMemberRepository.canUserManageCourse(courseId, requesterId)) {
      throw new ValidationException("You don't have permission to view course analytics");
    }
  }

  private List<Assignment> publishedAssignments(UUID courseId) {
    return assignmentRepository.findByCourseId(courseId).stream()
        .filter(assignment -> !Boolean.TRUE.equals(assignment.getIsArchived()))
        .filter(assignment -> Boolean.TRUE.equals(assignment.getIsPublished()))
        .toList();
  }

  private List<Submission> loadSubmissions(List<Assignment> assignments) {
    List<UUID> assignmentIds = assignments.stream().map(Assignment::getId).toList();
    if (assignmentIds.isEmpty()) {
      return List.of();
    }
    return submissionRepository.findByAssignmentIdIn(assignmentIds);
  }

  private Map<UUID, List<Submission>> groupSubmissionsByStudent(List<Assignment> assignments) {
    return loadSubmissions(assignments).stream().collect(Collectors.groupingBy(Submission::getUserId));
  }

  private Map<UUID, String> loadUserDisplayNames(Collection<UUID> userIds) {
    if (userIds.isEmpty()) {
      return Map.of();
    }

    try {
      String placeholders = userIds.stream().map(id -> "?").collect(Collectors.joining(","));
      String sql =
          "SELECT id, COALESCE(display_name, CONCAT(first_name, ' ', last_name), email) as name "
              + "FROM users WHERE id IN ("
              + placeholders
              + ")";

      return jdbcTemplate.query(
          sql,
          (rs, rowNum) -> Map.entry(UUID.fromString(rs.getString("id")), rs.getString("name")),
          userIds.toArray()).stream()
          .collect(
              Collectors.toMap(
                  Map.Entry::getKey,
                  Map.Entry::getValue,
                  (left, right) -> left,
                  LinkedHashMap::new));
    } catch (Exception ex) {
      log.warn("Failed to load user display names for analytics: {}", ex.getMessage());
      return new HashMap<>();
    }
  }

  private boolean isPendingGrading(String status) {
    return status != null && PENDING_GRADING_STATUSES.contains(status.toUpperCase());
  }

  private boolean isCompletedSubmission(String status) {
    return status != null && COMPLETED_SUBMISSION_STATUSES.contains(status.toUpperCase());
  }

  private LocalDateTime lastActivityAt(Submission submission) {
    if (submission.getLastResubmittedAt() != null) {
      return submission.getLastResubmittedAt();
    }
    if (submission.getSubmittedAt() != null) {
      return submission.getSubmittedAt();
    }
    if (submission.getUpdatedAt() != null) {
      return submission.getUpdatedAt();
    }
    return submission.getCreatedAt();
  }

  private double roundToOneDecimal(double value) {
    return Math.round(value * 10.0) / 10.0;
  }
}
