package com.university.lms.course.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.Resource;
import com.university.lms.course.dto.CoursePreviewDto;
import com.university.lms.course.dto.CoursePreviewModuleDto;
import com.university.lms.course.dto.TeacherTodoDashboardDto;
import com.university.lms.course.dto.TeacherTodoDeadlineItemDto;
import com.university.lms.course.dto.TeacherTodoMissingItemDto;
import com.university.lms.course.dto.TeacherTodoSubmissionItemDto;
import com.university.lms.course.dto.StudentContextReminderDto;
import com.university.lms.course.dto.StudentContextReminderFeedDto;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.repository.ResourceRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
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

/** Read-model service for preview/insight endpoints (course preview + teacher to-do dashboard). */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseInsightsService {

  private static final String ROLE_SUPERADMIN = "SUPERADMIN";

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final ModuleRepository moduleRepository;
  private final ResourceRepository resourceRepository;
  private final AssignmentRepository assignmentRepository;
  private final SubmissionRepository submissionRepository;
  private final JdbcTemplate jdbcTemplate;

  /** Public course preview for elective landing page. */
  public CoursePreviewDto getCoursePreview(UUID courseId) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
    if (!Boolean.TRUE.equals(course.getIsPublished())) {
      throw new ValidationException("Course preview is unavailable for unpublished courses");
    }

    List<Module> publishedModules = moduleRepository.findPublishedModulesByCourse(courseId);
    List<Assignment> assignments =
        assignmentRepository.findByCourseId(courseId).stream()
            .filter(assignment -> !Boolean.TRUE.equals(assignment.getIsArchived()))
            .filter(assignment -> Boolean.TRUE.equals(assignment.getIsPublished()))
            .toList();

    Map<UUID, List<String>> assignmentTitlesByModule =
        assignments.stream()
            .filter(assignment -> assignment.getModuleId() != null)
            .collect(
                Collectors.groupingBy(
                    Assignment::getModuleId,
                    Collectors.mapping(Assignment::getTitle, Collectors.toList())));

    List<CoursePreviewModuleDto> moduleDtos = new ArrayList<>();
    for (Module module : publishedModules) {
      List<Resource> resources = resourceRepository.findByModuleIdOrderByPositionAsc(module.getId());
      moduleDtos.add(
          CoursePreviewModuleDto.builder()
              .moduleId(module.getId())
              .title(module.getTitle())
              .description(module.getDescription())
              .position(module.getPosition())
              .resourceTitles(resources.stream().map(Resource::getTitle).toList())
              .assignmentTitles(
                  assignmentTitlesByModule.getOrDefault(module.getId(), List.of()).stream().toList())
              .build());
    }

    return CoursePreviewDto.builder()
        .courseId(course.getId())
        .code(course.getCode())
        .titleUk(course.getTitleUk())
        .titleEn(course.getTitleEn())
        .descriptionUk(course.getDescriptionUk())
        .descriptionEn(course.getDescriptionEn())
        .syllabus(course.getSyllabus())
        .ownerId(course.getOwnerId())
        .ownerName(loadUserDisplayName(course.getOwnerId()))
        .thumbnailUrl(course.getThumbnailUrl())
        .themeColor(course.getThemeColor())
        .academicYear(course.getAcademicYear())
        .moduleCount(moduleDtos.size())
        .assignmentCount(assignments.size())
        .modules(moduleDtos)
        .build();
  }

  /** Aggregated "to-do" dashboard for instructors across managed courses. */
  public TeacherTodoDashboardDto getTeacherTodoDashboard(
      UUID userId, String userRole, UUID filterCourseId) {
    Set<UUID> manageableCourseIds = resolveManageableCourseIds(userId, userRole);
    if (filterCourseId != null) {
      if (!manageableCourseIds.contains(filterCourseId)) {
        throw new ValidationException("User does not have permission to view this course to-do list");
      }
      manageableCourseIds = Set.of(filterCourseId);
    }

    if (manageableCourseIds.isEmpty()) {
      return TeacherTodoDashboardDto.builder()
          .userId(userId)
          .generatedAt(LocalDateTime.now())
          .build();
    }

    List<Course> courses = courseRepository.findAllById(manageableCourseIds);
    Map<UUID, Course> courseById =
        courses.stream().collect(Collectors.toMap(Course::getId, course -> course));

    List<Assignment> assignments =
        assignmentRepository.findByCourseIdIn(new ArrayList<>(manageableCourseIds)).stream()
            .filter(assignment -> !Boolean.TRUE.equals(assignment.getIsArchived()))
            .filter(assignment -> Boolean.TRUE.equals(assignment.getIsPublished()))
            .toList();
    List<UUID> assignmentIds = assignments.stream().map(Assignment::getId).toList();
    Map<UUID, List<Submission>> submissionsByAssignment =
        assignmentIds.isEmpty()
            ? Map.of()
            : submissionRepository.findByAssignmentIdIn(assignmentIds).stream()
                .collect(Collectors.groupingBy(Submission::getAssignmentId));

    Map<UUID, Set<UUID>> activeStudentsByCourse = new HashMap<>();
    Set<UUID> allStudentIds = new HashSet<>();
    for (UUID courseId : manageableCourseIds) {
      Set<UUID> students = new LinkedHashSet<>(courseMemberRepository.findActiveStudentUserIdsByCourseId(courseId));
      activeStudentsByCourse.put(courseId, students);
      allStudentIds.addAll(students);
    }
    Map<UUID, String> userNames = loadUserDisplayNames(allStudentIds);

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime upcomingWindow = now.plusDays(7);

    List<TeacherTodoSubmissionItemDto> pendingGrading = new ArrayList<>();
    List<TeacherTodoMissingItemDto> missingSubmissions = new ArrayList<>();
    List<TeacherTodoDeadlineItemDto> upcomingDeadlines = new ArrayList<>();

    for (Assignment assignment : assignments) {
      Course course = courseById.get(assignment.getCourseId());
      if (course == null) {
        continue;
      }

      List<Submission> submissions = submissionsByAssignment.getOrDefault(assignment.getId(), List.of());
      Set<UUID> submittedStudentIds =
          submissions.stream()
              .filter(submission -> isSubmittedOrGraded(submission.getStatus()))
              .map(Submission::getUserId)
              .collect(Collectors.toSet());

      for (Submission submission : submissions) {
        if ("SUBMITTED".equalsIgnoreCase(submission.getStatus())
            || "IN_REVIEW".equalsIgnoreCase(submission.getStatus())
            || "GRADED_DRAFT".equalsIgnoreCase(submission.getStatus())) {
          pendingGrading.add(
              TeacherTodoSubmissionItemDto.builder()
                  .submissionId(submission.getId())
                  .assignmentId(assignment.getId())
                  .courseId(course.getId())
                  .courseCode(course.getCode())
                  .assignmentTitle(assignment.getTitle())
                  .studentId(submission.getUserId())
                  .studentName(resolveStudentName(submission.getUserId(), submission.getStudentName(), userNames))
                  .submittedAt(submission.getSubmittedAt())
                  .dueDate(assignment.getDueDate())
                  .build());
        }
      }

      LocalDateTime dueDate = assignment.getDueDate();
      if (dueDate == null) {
        continue;
      }

      Set<UUID> expectedStudents = activeStudentsByCourse.getOrDefault(assignment.getCourseId(), Set.of());
      if (dueDate.isAfter(now) && !dueDate.isAfter(upcomingWindow)) {
        upcomingDeadlines.add(
            TeacherTodoDeadlineItemDto.builder()
                .assignmentId(assignment.getId())
                .courseId(course.getId())
                .courseCode(course.getCode())
                .assignmentTitle(assignment.getTitle())
                .submittedCount(submittedStudentIds.size())
                .expectedStudentCount(expectedStudents.size())
                .dueDate(dueDate)
                .build());
      }

      if (dueDate.isBefore(now)) {
        for (UUID studentId : expectedStudents) {
          if (submittedStudentIds.contains(studentId)) {
            continue;
          }
          long daysOverdue = Math.max(Duration.between(dueDate, now).toDays(), 0);
          missingSubmissions.add(
              TeacherTodoMissingItemDto.builder()
                  .assignmentId(assignment.getId())
                  .courseId(course.getId())
                  .courseCode(course.getCode())
                  .assignmentTitle(assignment.getTitle())
                  .studentId(studentId)
                  .studentName(userNames.getOrDefault(studentId, "Student"))
                  .daysOverdue(daysOverdue)
                  .dueDate(dueDate)
                  .build());
        }
      }
    }

    pendingGrading.sort(Comparator.comparing(TeacherTodoSubmissionItemDto::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())));
    missingSubmissions.sort(Comparator.comparingLong(TeacherTodoMissingItemDto::getDaysOverdue).reversed());
    upcomingDeadlines.sort(Comparator.comparing(TeacherTodoDeadlineItemDto::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));

    return TeacherTodoDashboardDto.builder()
        .userId(userId)
        .generatedAt(LocalDateTime.now())
        .pendingGradingCount(pendingGrading.size())
        .missingSubmissionCount(missingSubmissions.size())
        .upcomingDeadlineCount(upcomingDeadlines.size())
        .pendingGrading(pendingGrading.stream().limit(200).toList())
        .missingSubmissions(missingSubmissions.stream().limit(300).toList())
        .upcomingDeadlines(upcomingDeadlines.stream().limit(200).toList())
        .build();
  }

  /** Contextual student reminders ("you haven't started, expected effort ~3h", etc.). */
  public StudentContextReminderFeedDto getStudentContextReminders(UUID userId) {
    List<UUID> courseIds = courseMemberRepository.findActiveCourseIdsByUserId(userId);
    if (courseIds.isEmpty()) {
      return StudentContextReminderFeedDto.builder()
          .userId(userId)
          .generatedAt(LocalDateTime.now())
          .build();
    }

    List<Course> courses = courseRepository.findAllById(courseIds);
    Map<UUID, Course> courseById = courses.stream().collect(Collectors.toMap(Course::getId, course -> course));
    List<Assignment> assignments =
        assignmentRepository.findByCourseIdIn(courseIds).stream()
            .filter(assignment -> Boolean.TRUE.equals(assignment.getIsPublished()))
            .filter(assignment -> !Boolean.TRUE.equals(assignment.getIsArchived()))
            .filter(assignment -> assignment.getDueDate() != null)
            .toList();

    List<UUID> assignmentIds = assignments.stream().map(Assignment::getId).toList();
    Map<UUID, Submission> latestSubmissionByAssignment = new HashMap<>();
    if (!assignmentIds.isEmpty()) {
      for (Submission submission : submissionRepository.findByAssignmentIdInAndUserId(assignmentIds, userId)) {
        Submission existing = latestSubmissionByAssignment.get(submission.getAssignmentId());
        if (existing == null
            || (existing.getUpdatedAt() != null
                && submission.getUpdatedAt() != null
                && submission.getUpdatedAt().isAfter(existing.getUpdatedAt()))) {
          latestSubmissionByAssignment.put(submission.getAssignmentId(), submission);
        } else if (existing == null) {
          latestSubmissionByAssignment.put(submission.getAssignmentId(), submission);
        }
      }
    }

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime soonWindow = now.plusHours(72);
    List<StudentContextReminderDto> reminders = new ArrayList<>();

    for (Assignment assignment : assignments) {
      Course course = courseById.get(assignment.getCourseId());
      if (course == null) {
        continue;
      }
      Submission submission = latestSubmissionByAssignment.get(assignment.getId());
      String status = submission != null ? submission.getStatus() : null;
      boolean submitted = isSubmittedOrGraded(status);
      if (submitted) {
        continue;
      }

      LocalDateTime dueDate = assignment.getDueDate();
      if (dueDate == null) {
        continue;
      }

      boolean overdue = dueDate.isBefore(now);
      boolean soon = !overdue && !dueDate.isAfter(soonWindow);
      if (!overdue && !soon) {
        continue;
      }

      double estimatedHours =
          assignment.getEstimatedDuration() != null
              ? Math.max(assignment.getEstimatedDuration() / 60.0d, 0.5d)
              : 3.0d;
      boolean started = submission != null;
      String severity = overdue ? "OVERDUE" : (dueDate.toLocalDate().equals(now.toLocalDate()) ? "TODAY" : "SOON");
      String recommendation;
      if (!started) {
        recommendation =
            String.format(
                "You have not started this task yet. Typical completion time is about %.1f hours.",
                estimatedHours);
      } else if ("DRAFT".equalsIgnoreCase(status)) {
        recommendation =
            String.format(
                "You already have a draft. Reserve %.1f hours to finalize and submit.",
                estimatedHours);
      } else {
        recommendation =
            String.format(
                "Task is pending completion. Estimated effort remaining: %.1f hours.",
                estimatedHours);
      }
      if (overdue) {
        long overdueHours = Math.max(Duration.between(dueDate, now).toHours(), 1);
        recommendation = recommendation + " It is overdue by " + overdueHours + "h.";
      }

      reminders.add(
          StudentContextReminderDto.builder()
              .assignmentId(assignment.getId())
              .courseId(course.getId())
              .courseCode(course.getCode())
              .assignmentTitle(assignment.getTitle())
              .severity(severity)
              .recommendation(recommendation)
              .started(started)
              .submitted(false)
              .estimatedHours(estimatedHours)
              .dueDate(dueDate)
              .build());
    }

    reminders.sort(
        Comparator.comparing(
                (StudentContextReminderDto item) ->
                    "OVERDUE".equals(item.getSeverity()) ? 0 : ("TODAY".equals(item.getSeverity()) ? 1 : 2))
            .thenComparing(StudentContextReminderDto::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));

    return StudentContextReminderFeedDto.builder()
        .userId(userId)
        .generatedAt(LocalDateTime.now())
        .reminders(reminders.stream().limit(30).toList())
        .build();
  }

  private Set<UUID> resolveManageableCourseIds(UUID userId, String userRole) {
    if (ROLE_SUPERADMIN.equalsIgnoreCase(userRole)) {
      return courseRepository.findAll().stream().map(Course::getId).collect(Collectors.toSet());
    }
    Set<UUID> ids = new LinkedHashSet<>(courseRepository.findIdsByOwnerId(userId));
    ids.addAll(courseMemberRepository.findManagedCourseIdsByUserId(userId));
    return ids;
  }

  private boolean isSubmittedOrGraded(String status) {
    if (status == null) {
      return false;
    }
    String normalized = status.trim().toUpperCase();
    return "SUBMITTED".equals(normalized)
        || "IN_REVIEW".equals(normalized)
        || "GRADED".equals(normalized)
        || "GRADED_DRAFT".equals(normalized)
        || "GRADED_PUBLISHED".equals(normalized);
  }

  private String resolveStudentName(UUID userId, String submittedName, Map<UUID, String> names) {
    if (submittedName != null && !submittedName.isBlank()) {
      return submittedName;
    }
    return names.getOrDefault(userId, "Student");
  }

  private String loadUserDisplayName(UUID userId) {
    if (userId == null) {
      return null;
    }
    Map<UUID, String> names = loadUserDisplayNames(Set.of(userId));
    return names.get(userId);
  }

  private Map<UUID, String> loadUserDisplayNames(Set<UUID> userIds) {
    if (userIds == null || userIds.isEmpty()) {
      return Map.of();
    }
    String placeholders = userIds.stream().map(id -> "?").collect(Collectors.joining(","));
    String sql =
        "SELECT id, COALESCE(display_name, NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''), email) AS name "
            + "FROM users WHERE id IN ("
            + placeholders
            + ")";
    Map<UUID, String> output = new HashMap<>();
    jdbcTemplate.query(
        sql,
        rs -> {
          UUID id = UUID.fromString(rs.getString("id"));
          output.put(id, rs.getString("name"));
        },
        userIds.toArray());
    return output;
  }
}
