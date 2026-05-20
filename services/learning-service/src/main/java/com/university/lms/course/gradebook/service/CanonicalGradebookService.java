package com.university.lms.course.gradebook.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.QuizAttempt;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.Module;
import com.university.lms.course.gradebook.dto.GradebookCellUpdateRequest;
import com.university.lms.course.gradebook.dto.GradebookPublishRequest;
import com.university.lms.course.gradebook.dto.StudentGradebookDto;
import com.university.lms.course.gradebook.dto.TeacherGradebookDto;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CanonicalGradebookService {
  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final ModuleRepository moduleRepository;
  private final AssignmentRepository assignmentRepository;
  private final GradebookEntryRepository gradebookEntryRepository;
  private final SubmissionRepository submissionRepository;
  private final CourseAccessService accessService;

  @Transactional(readOnly = true)
  public StudentGradebookDto studentGradebook(UUID courseId, UUID userId) {
    accessService.requireStudent(courseId, userId);
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> ApiException.notFound("Course"));
    List<Assignment> assignments = visibleAssignments(courseId);
    Map<UUID, GradebookEntry> entries = gradebookEntryRepository
        .findByCourseIdAndStudentId(courseId, userId)
        .stream()
        .filter(entry -> entry.getAssignmentId() != null)
        .filter(GradebookEntry::isPublishedGrade)
        .collect(Collectors.toMap(GradebookEntry::getAssignmentId, Function.identity(), (a, b) -> a));
    List<StudentGradebookDto.ModuleGradeDto> modules = moduleRepository.findByCourseIdOrderByPositionAsc(courseId)
        .stream()
        .map(module -> studentModule(module, assignments, entries))
        .toList();
    return new StudentGradebookDto(courseId, courseTitle(course), total(modules), modules);
  }

  @Transactional(readOnly = true)
  public TeacherGradebookDto teacherGradebook(UUID courseId, UUID userId) {
    accessService.requireTeacher(courseId, userId);
    List<CourseMember> students = courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, "STUDENT")
        .stream()
        .filter(CourseMember::isActive)
        .toList();
    List<Assignment> assignments = assignmentRepository.findByCourseId(courseId)
        .stream()
        .filter(a -> !Boolean.TRUE.equals(a.getIsArchived()))
        .sorted(Comparator.comparing(a -> a.getPosition() == null ? 0 : a.getPosition()))
        .toList();
    Map<String, Submission> submissions = submissionRepository.findByAssignmentIdIn(
            assignments.stream().map(Assignment::getId).toList())
        .stream()
        .collect(Collectors.toMap(
            s -> s.getAssignmentId() + ":" + s.getUserId(),
            Function.identity(),
            (a, b) -> a));
    List<GradebookEntry> entries = gradebookEntryRepository.findAllByCourseId(courseId);
    Map<String, GradebookEntry> entriesByCell = entries.stream()
        .filter(entry -> entry.getAssignmentId() != null)
        .collect(Collectors.toMap(
            entry -> entry.getAssignmentId() + ":" + entry.getStudentId(),
            Function.identity(),
            (a, b) -> a));
    return new TeacherGradebookDto(
        courseId,
        students.stream()
            .map(student -> new TeacherGradebookDto.StudentDto(
                student.getUserId(), student.getUserId().toString(), null))
            .toList(),
        assignments.stream()
            .map(a -> new TeacherGradebookDto.AssignmentColumnDto(
                a.getId(),
                a.getModuleId(),
                a.getTitle(),
                com.university.lms.course.assignments.service.AssignmentTypeMapper.toCanonical(a.getAssignmentType()),
                a.getMaxPoints(),
                a.getDueDate()))
            .toList(),
        students.stream()
            .flatMap(student -> assignments.stream()
                .map(assignment -> teacherCell(
                    student.getUserId(),
                    assignment,
                    entriesByCell.get(assignment.getId() + ":" + student.getUserId()),
                    submissions.get(assignment.getId() + ":" + student.getUserId()))))
            .toList());
  }

  @Transactional
  public void updateCells(UUID courseId, UUID userId, GradebookCellUpdateRequest request) {
    accessService.requireTeacher(courseId, userId);
    for (GradebookCellUpdateRequest.CellUpdate cell : request.cells()) {
      Assignment assignment = assignmentRepository.findById(cell.assignmentId())
          .orElseThrow(() -> ApiException.notFound("Assignment"));
      if (!assignment.getCourseId().equals(courseId)) {
        throw ApiException.badRequest("ASSIGNMENT_COURSE_MISMATCH", "Assignment is outside this course");
      }
      requireActiveStudent(courseId, cell.studentId());
      if (cell.points().compareTo(assignment.getMaxPoints()) > 0) {
        throw ApiException.badRequest("GRADE_EXCEEDS_MAX_POINTS", "Grade cannot exceed maxPoints");
      }
      GradebookEntry entry = findOrCreateEntry(assignment, cell.studentId());
      entry.setDraftScore(cell.points());
      entry.setDraftComment(cell.comment());
      entry.setDraftGradedBy(userId);
      entry.setDraftGradedAt(LocalDateTime.now());
      entry.setStatus(GradeStatus.DRAFT);
      gradebookEntryRepository.save(entry);
    }
  }

  @Transactional
  public void publish(UUID courseId, UUID userId, GradebookPublishRequest request) {
    accessService.requireTeacher(courseId, userId);
    List<GradebookEntry> entries = gradebookEntryRepository
        .findByCourseIdAndAssignmentIdIn(courseId, request.assignmentIds())
        .stream()
        .filter(entry -> request.studentIds() == null || request.studentIds().contains(entry.getStudentId()))
        .toList();
    for (GradebookEntry entry : entries) {
      if (entry.getDraftScore() != null) {
        entry.setPublishedScore(entry.getDraftScore());
        entry.setPublishedComment(entry.getDraftComment());
        entry.setPublishedBy(userId);
        entry.setPublishedAt(LocalDateTime.now());
        entry.setStatus(GradeStatus.PUBLISHED);
      }
    }
    gradebookEntryRepository.saveAll(entries);
  }

  public void ensureGradebookEntriesForAssignment(Assignment assignment) {
    List<GradebookEntry> existing = gradebookEntryRepository.findByAssignmentId(assignment.getId());
    Map<UUID, GradebookEntry> existingByStudent = existing.stream()
        .collect(Collectors.toMap(GradebookEntry::getStudentId, Function.identity()));
    List<GradebookEntry> missing = courseMemberRepository
        .findActiveStudentUserIdsByCourseId(assignment.getCourseId())
        .stream()
        .filter(studentId -> !existingByStudent.containsKey(studentId))
        .map(studentId -> baseEntry(assignment, studentId))
        .toList();
    if (!missing.isEmpty()) {
      gradebookEntryRepository.saveAll(missing);
    }
  }

  public void markSubmitted(Assignment assignment, Submission submission) {
    GradebookEntry entry = findOrCreateEntry(assignment, submission.getUserId());
    entry.setSubmissionId(submission.getId());
    entry.setStatus(submission.getIsLate() ? GradeStatus.LATE : GradeStatus.SUBMITTED);
    entry.setLate(Boolean.TRUE.equals(submission.getIsLate()));
    gradebookEntryRepository.save(entry);
  }

  public void saveDraft(
      Assignment assignment,
      Submission submission,
      BigDecimal points,
      String comment,
      UUID gradedBy) {
    GradebookEntry entry = findOrCreateEntry(assignment, submission.getUserId());
    entry.setSubmissionId(submission.getId());
    entry.setDraftScore(points);
    entry.setDraftComment(comment);
    entry.setDraftGradedBy(gradedBy);
    entry.setDraftGradedAt(LocalDateTime.now());
    entry.setStatus(GradeStatus.DRAFT);
    gradebookEntryRepository.save(entry);
  }

  public void publish(Assignment assignment, Submission submission, UUID publishedBy) {
    GradebookEntry entry = findOrCreateEntry(assignment, submission.getUserId());
    entry.setSubmissionId(submission.getId());
    entry.setPublishedScore(submission.getDraftGrade());
    entry.setPublishedComment(submission.getDraftFeedback());
    entry.setPublishedBy(publishedBy);
    entry.setPublishedAt(LocalDateTime.now());
    entry.setStatus(GradeStatus.PUBLISHED);
    gradebookEntryRepository.save(entry);
  }

  public void recordQuizAttempt(Assignment assignment, QuizAttempt attempt) {
    GradebookEntry entry = findOrCreateEntry(assignment, attempt.getUserId());
    entry.setPublishedScore(attempt.getFinalScore());
    entry.setPublishedComment("Auto-scored quiz attempt " + attempt.getAttemptNumber());
    entry.setPublishedAt(LocalDateTime.now());
    entry.setStatus(GradeStatus.PUBLISHED);
    gradebookEntryRepository.save(entry);
  }

  private void requireActiveStudent(UUID courseId, UUID studentId) {
    CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, studentId)
        .orElseThrow(() -> ApiException.badRequest("STUDENT_NOT_ENROLLED", "Student is not enrolled in this course"));
    if (!member.isActive() || !member.isStudent()) {
      throw ApiException.badRequest("STUDENT_NOT_ACTIVE", "Gradebook cells can only be edited for active students");
    }
  }

  private GradebookEntry findOrCreateEntry(Assignment assignment, UUID studentId) {
    return gradebookEntryRepository.findByAssignmentIdAndStudentId(assignment.getId(), studentId)
        .orElseGet(() -> baseEntry(assignment, studentId));
  }

  private GradebookEntry baseEntry(Assignment assignment, UUID studentId) {
    return GradebookEntry.builder()
        .courseId(assignment.getCourseId())
        .studentId(studentId)
        .assignmentId(assignment.getId())
        .maxScore(assignment.getMaxPoints())
        .status(GradeStatus.NOT_SUBMITTED)
        .build();
  }

  private TeacherGradebookDto.GradeCellDto teacherCell(
      UUID studentId,
      Assignment assignment,
      GradebookEntry entry,
      Submission submission) {
    boolean published = entry != null && entry.isPublishedGrade();
    return new TeacherGradebookDto.GradeCellDto(
        studentId,
        assignment.getId(),
        submission == null ? null : submission.getId(),
        entry == null ? null : entry.getDraftScore(),
        entry == null || !published ? null : entry.getPublishedFinalScore(),
        assignment.getMaxPoints(),
        entry == null ? "not_submitted" : entry.getStatus().name().toLowerCase(),
        entry == null
            ? null
            : (published ? entry.getPublishedFinalComment() : entry.getDraftComment()));
  }

  private StudentGradebookDto.ModuleGradeDto studentModule(
      Module module,
      List<Assignment> assignments,
      Map<UUID, GradebookEntry> entries) {
    List<StudentGradebookDto.AssignmentGradeDto> grades = assignments.stream()
        .filter(assignment -> module.getId().equals(assignment.getModuleId()))
        .map(assignment -> {
          GradebookEntry entry = entries.get(assignment.getId());
          return new StudentGradebookDto.AssignmentGradeDto(
              assignment.getId(),
              assignment.getTitle(),
              com.university.lms.course.assignments.service.AssignmentTypeMapper.toCanonical(assignment.getAssignmentType()),
              entry == null ? null : entry.getPublishedFinalScore(),
              assignment.getMaxPoints(),
              entry == null ? "not_published" : entry.getStatus().name().toLowerCase(),
              entry == null ? null : entry.getPublishedFinalComment());
        })
        .toList();
    return new StudentGradebookDto.ModuleGradeDto(module.getId(), module.getTitle(), totalAssignments(grades), grades);
  }

  private StudentGradebookDto.GradebookTotalDto total(List<StudentGradebookDto.ModuleGradeDto> modules) {
    BigDecimal points = modules.stream().map(m -> m.total().points()).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal max = modules.stream().map(m -> m.total().maxPoints()).reduce(BigDecimal.ZERO, BigDecimal::add);
    return total(points, max);
  }

  private StudentGradebookDto.GradebookTotalDto totalAssignments(
      List<StudentGradebookDto.AssignmentGradeDto> assignments) {
    BigDecimal points = assignments.stream()
        .map(StudentGradebookDto.AssignmentGradeDto::points)
        .filter(java.util.Objects::nonNull)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal max = assignments.stream()
        .map(StudentGradebookDto.AssignmentGradeDto::maxPoints)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    return total(points, max);
  }

  private StudentGradebookDto.GradebookTotalDto total(BigDecimal points, BigDecimal max) {
    BigDecimal percentage = max.compareTo(BigDecimal.ZERO) == 0
        ? null
        : points.divide(max, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    return new StudentGradebookDto.GradebookTotalDto(points, max, percentage);
  }

  private List<Assignment> visibleAssignments(UUID courseId) {
    return assignmentRepository.findByCourseId(courseId).stream()
        .filter(a -> Boolean.TRUE.equals(a.getIsPublished()))
        .filter(a -> !Boolean.TRUE.equals(a.getIsArchived()))
        .toList();
  }

  private String courseTitle(Course course) {
    return course.getTitleEn() != null && !course.getTitleEn().isBlank()
        ? course.getTitleEn()
        : course.getTitleUk();
  }
}
