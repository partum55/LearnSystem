package com.university.lms.course.courses.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assignments.dto.AssignmentListItemDto;
import com.university.lms.course.assignments.service.CanonicalAssignmentMapper;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.AssignmentStatus;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.courses.dto.CourseOverviewDto;
import com.university.lms.course.courses.dto.CourseSummaryDto;
import com.university.lms.course.courses.dto.StudentDashboardDto;
import com.university.lms.course.courses.dto.UpcomingDeadlineDto;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.ModuleStatus;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.dto.CreateCourseRequest;
import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.service.LearningContentService;
import com.university.lms.course.modules.dto.CourseModuleDto;
import com.university.lms.course.modules.dto.CourseModulesResponse;
import com.university.lms.course.modules.dto.ModuleRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.service.CourseMapper;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CanonicalCourseService {
  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final ModuleRepository moduleRepository;
  private final AssignmentRepository assignmentRepository;
  private final GradebookEntryRepository gradebookEntryRepository;
  private final LearningContentService learningContentService;
  private final CanonicalAssignmentMapper assignmentMapper;
  private final CourseAccessService accessService;
  private final CourseMapper courseMapper;

  @Transactional(readOnly = true)
  public StudentDashboardDto studentDashboard(UUID userId) {
    List<CourseMember> memberships = courseMemberRepository
        .findActiveEnrollmentsForUser(userId, PageRequest.of(0, 100))
        .stream()
        .filter(CourseMember::isStudent)
        .toList();
    List<CourseSummaryDto> courses = memberships.stream()
        .map(CourseMember::getCourse)
        .filter(course -> course.getStatus() == CourseStatus.PUBLISHED)
        .map(course -> courseSummary(course, userId))
        .toList();
    List<UUID> courseIds = memberships.stream().map(m -> m.getCourse().getId()).toList();
    List<UpcomingDeadlineDto> deadlines = assignmentRepository.findByCourseIdIn(courseIds).stream()
        .filter(a -> a.getStatus() == AssignmentStatus.PUBLISHED)
        .filter(a -> a.getDueDate() != null && a.getDueDate().isAfter(LocalDateTime.now()))
        .sorted(Comparator.comparing(Assignment::getDueDate))
        .limit(10)
        .map(a -> upcomingDeadline(a, courseRepository.findById(a.getCourseId()).orElse(null)))
        .toList();
    long pending = assignmentRepository.findByCourseIdIn(courseIds).stream()
        .filter(a -> a.getStatus() == AssignmentStatus.PUBLISHED)
        .filter(a -> !hasGradeOrSubmission(a.getId(), userId))
        .count();
    return new StudentDashboardDto(courses.size(), deadlines.size(), pending, courses, deadlines);
  }

  @Transactional(readOnly = true)
  public List<CourseSummaryDto> myActiveCourses(UUID userId) {
    return courseMemberRepository.findActiveEnrollmentsForUser(userId, PageRequest.of(0, 200))
        .stream()
        .filter(CourseMember::isStudent)
        .map(CourseMember::getCourse)
        .filter(course -> course.getStatus() == CourseStatus.PUBLISHED)
        .map(course -> courseSummary(course, userId))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CourseSummaryDto> myTeachingCourses(UUID userId) {
    return courseMemberRepository.findActiveEnrollmentsForUser(userId, PageRequest.of(0, 200))
        .stream()
        .filter(member -> member.isOwner() || member.isTeacher() || member.isTA())
        .map(CourseMember::getCourse)
        .filter(course -> course.getStatus() == CourseStatus.DRAFT || course.getStatus() == CourseStatus.PUBLISHED)
        .map(course -> courseSummary(course, userId))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CourseSummaryDto> courses(UUID userId, String globalRole, CourseStatus status) {
    if ("ADMIN".equalsIgnoreCase(globalRole)) {
      List<Course> courses = status == null
          ? courseRepository.findByStatusIn(List.of(CourseStatus.DRAFT, CourseStatus.PUBLISHED), PageRequest.of(0, 500)).getContent()
          : courseRepository.findByStatus(status, PageRequest.of(0, 500)).getContent();
      return courses.stream()
          .map(course -> courseSummary(course, userId))
          .toList();
    }

    Set<CourseStatus> activeStatuses = Set.of(CourseStatus.DRAFT, CourseStatus.PUBLISHED);
    return courseMemberRepository.findActiveEnrollmentsForUser(userId, PageRequest.of(0, 500))
        .stream()
        .filter(member -> isVisibleInList(member, status, activeStatuses))
        .map(CourseMember::getCourse)
        .map(course -> courseSummary(course, userId))
        .toList();
  }

  @Transactional
  public CourseDto createCourse(CreateCourseRequest request, UUID userId, String globalRole) {
    if (!"ADMIN".equalsIgnoreCase(globalRole) && !"TEACHER".equalsIgnoreCase(globalRole)) {
      throw new ValidationException("Only ADMIN or global TEACHER accounts can create courses");
    }
    if (courseRepository.existsByCode(request.getCode())) {
      throw new ValidationException("Course with code '" + request.getCode() + "' already exists");
    }
    Course course = courseMapper.toEntity(request, userId);
    Course saved = courseRepository.save(course);
    courseMemberRepository.save(CourseMember.builder()
        .course(saved)
        .userId(userId)
        .roleInCourse(CourseRole.OWNER)
        .status(CourseMemberStatus.ACTIVE)
        .addedBy(userId)
        .build());
    return courseMapper.toDto(saved);
  }

  @Transactional(readOnly = true)
  public CourseOverviewDto overview(UUID courseId, UUID userId) {
    accessService.requireCourseAccess(courseId, userId);
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> ApiException.notFound("Course"));
    List<UpcomingDeadlineDto> deadlines = assignmentRepository.findByCourseId(courseId).stream()
        .filter(a -> a.getStatus() == AssignmentStatus.PUBLISHED)
        .filter(a -> a.getDueDate() != null && a.getDueDate().isAfter(LocalDateTime.now()))
        .sorted(Comparator.comparing(Assignment::getDueDate))
        .limit(5)
        .map(a -> upcomingDeadline(a, course))
        .toList();
    return new CourseOverviewDto(
        course.getId(),
        title(course),
        description(course),
        course.getStatus().name(),
        teacherName(course),
        progress(courseId, userId),
        courseGrade(courseId, userId),
        deadlines,
        recentFeedback(courseId, userId));
  }

  @Transactional(readOnly = true)
  public CourseDto getCourse(UUID courseId, UUID userId) {
    accessService.requireCourseAccess(courseId, userId);
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> ApiException.notFound("Course"));
    return courseMapper.toDto(course);
  }

  @Transactional(readOnly = true)
  public CourseModulesResponse modules(UUID courseId, UUID userId) {
    accessService.requireCourseAccess(courseId, userId);
    boolean canTeach = accessService.canTeach(courseId, userId);
    List<GradebookEntry> grades = gradebookEntryRepository.findByCourseIdAndStudentId(courseId, userId);
    Map<UUID, GradebookEntry> gradesByAssignment = grades.stream()
        .filter(entry -> entry.getAssignmentId() != null)
        .filter(GradebookEntry::isPublishedGrade)
        .collect(Collectors.toMap(GradebookEntry::getAssignmentId, entry -> entry, (a, b) -> a));
    List<CourseModuleDto> modules = moduleRepository.findByCourseIdOrderByPositionAsc(courseId)
        .stream()
        .filter(module -> canTeach || module.isAvailable())
        .map(module -> moduleDto(module, userId, gradesByAssignment))
        .toList();
    return new CourseModulesResponse(modules);
  }

  @Transactional
  public CourseModuleDto createModule(UUID courseId, UUID userId, ModuleRequest request) {
    accessService.requireTeacherMutation(courseId, userId);
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> ApiException.notFound("Course"));
    Module module = Module.builder()
        .course(course)
        .title(request.title())
        .description(request.description())
        .position(request.order() == null ? moduleRepository.findMaxPositionByCourse(courseId) + 1 : request.order())
        .status(Boolean.TRUE.equals(request.visible()) ? ModuleStatus.PUBLISHED : ModuleStatus.DRAFT)
        .build();
    return moduleDto(moduleRepository.save(module), userId, Map.of());
  }

  @Transactional
  public CourseModuleDto updateModule(UUID moduleId, UUID userId, ModuleRequest request) {
    Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> ApiException.notFound("Module"));
    accessService.requireTeacherMutation(module.getCourse().getId(), userId);
    module.setTitle(request.title());
    module.setDescription(request.description());
    if (request.order() != null) {
      module.setPosition(request.order());
    }
    if (request.visible() != null) {
      module.setStatus(request.visible() ? ModuleStatus.PUBLISHED : ModuleStatus.DRAFT);
    }
    return moduleDto(moduleRepository.save(module), userId, Map.of());
  }

  @Transactional
  public void deleteModule(UUID moduleId, UUID userId) {
    Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> ApiException.notFound("Module"));
    accessService.requireTeacherMutation(module.getCourse().getId(), userId);
    moduleRepository.delete(module);
  }

  private CourseModuleDto moduleDto(
      Module module,
      UUID userId,
      Map<UUID, GradebookEntry> gradesByAssignment) {
    List<LearningItemDto> items = learningContentService.listModuleLearningItems(
        module.getCourse().getId(), module.getId(), userId);
    List<AssignmentListItemDto> assignments = assignmentRepository
        .findByModuleIdOrderByPositionAsc(module.getId())
        .stream()
        .filter(a -> a.getStatus() != AssignmentStatus.ARCHIVED)
        .filter(a -> accessService.canTeach(module.getCourse().getId(), userId) || a.getStatus() == AssignmentStatus.PUBLISHED)
        .map(a -> assignmentMapper.toListItem(a, gradesByAssignment.get(a.getId())))
        .toList();
    return new CourseModuleDto(
        module.getId(),
        module.getTitle(),
        module.getDescription(),
        module.getPosition() == null ? 0 : module.getPosition(),
        module.isAvailable() ? "available" : "locked",
        items,
        assignments);
  }

  private CourseSummaryDto courseSummary(Course course, UUID userId) {
    return new CourseSummaryDto(
        course.getId(),
        title(course),
        description(course),
        course.getStatus().name(),
        teacherName(course),
        progress(course.getId(), userId),
        courseGrade(course.getId(), userId));
  }

  private boolean isVisibleInList(
      CourseMember member,
      CourseStatus requestedStatus,
      Set<CourseStatus> activeStatuses) {
    Course course = member.getCourse();
    CourseStatus status = course.getStatus() == null ? CourseStatus.DRAFT : course.getStatus();
    CourseRole role = member.getRoleInCourse();

    if (requestedStatus != null && status != requestedStatus) {
      return false;
    }
    if (requestedStatus == null && !activeStatuses.contains(status)) {
      return false;
    }

    if (role == CourseRole.STUDENT) {
      return status == CourseStatus.PUBLISHED || status == CourseStatus.ARCHIVED;
    }

    return role == CourseRole.OWNER || role == CourseRole.TEACHER || role == CourseRole.TA;
  }

  private UpcomingDeadlineDto upcomingDeadline(Assignment assignment, Course course) {
    return new UpcomingDeadlineDto(
        assignment.getId(),
        assignment.getCourseId(),
        course == null ? null : title(course),
        assignment.getTitle(),
        assignment.getAssignmentType(),
        assignment.getDueDate());
  }

  private boolean hasGradeOrSubmission(UUID assignmentId, UUID userId) {
    return gradebookEntryRepository.findByAssignmentIdAndStudentId(assignmentId, userId)
        .filter(GradebookEntry::isPublishedGrade)
        .map(GradebookEntry::getPublishedFinalScore)
        .isPresent();
  }

  private List<String> recentFeedback(UUID courseId, UUID userId) {
    return gradebookEntryRepository.findByCourseIdAndStudentId(courseId, userId).stream()
        .filter(GradebookEntry::isPublishedGrade)
        .filter(entry -> entry.getPublishedFinalComment() != null && !entry.getPublishedFinalComment().isBlank())
        .sorted(Comparator.comparing(GradebookEntry::getUpdatedAt).reversed())
        .limit(5)
        .map(GradebookEntry::getPublishedFinalComment)
        .toList();
  }

  private double progress(UUID courseId, UUID userId) {
    List<Assignment> assignments = assignmentRepository.findByCourseId(courseId).stream()
        .filter(a -> a.getStatus() == AssignmentStatus.PUBLISHED)
        .toList();
    if (assignments.isEmpty()) {
      return 0;
    }
    long completed = gradebookEntryRepository.findByCourseIdAndStudentId(courseId, userId).stream()
        .filter(entry -> entry.getAssignmentId() != null)
        .filter(GradebookEntry::isPublishedGrade)
        .filter(entry -> entry.getPublishedFinalScore() != null)
        .count();
    return BigDecimal.valueOf(completed)
        .divide(BigDecimal.valueOf(assignments.size()), 4, RoundingMode.HALF_UP)
        .multiply(BigDecimal.valueOf(100))
        .doubleValue();
  }

  private Double courseGrade(UUID courseId, UUID userId) {
    List<GradebookEntry> entries = gradebookEntryRepository.findByCourseIdAndStudentId(courseId, userId)
        .stream()
        .filter(GradebookEntry::isPublishedGrade)
        .filter(entry -> entry.getPublishedFinalScore() != null)
        .toList();
    BigDecimal points = entries.stream()
        .map(GradebookEntry::getPublishedFinalScore)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal max = entries.stream()
        .map(GradebookEntry::getMaxScore)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    if (max.compareTo(BigDecimal.ZERO) == 0) {
      return null;
    }
    return points.divide(max, 4, RoundingMode.HALF_UP)
        .multiply(BigDecimal.valueOf(100))
        .doubleValue();
  }

  private String teacherName(Course course) {
    return courseMemberRepository.findCourseInstructors(course.getId()).stream()
        .findFirst()
        .map(member -> member.getUserId().toString())
        .orElse(course.getOwnerId().toString());
  }

  private String title(Course course) {
    return course.getTitleEn() != null && !course.getTitleEn().isBlank()
        ? course.getTitleEn()
        : course.getTitleUk();
  }

  private String description(Course course) {
    return course.getDescriptionEn() != null && !course.getDescriptionEn().isBlank()
        ? course.getDescriptionEn()
        : course.getDescriptionUk();
  }
}
