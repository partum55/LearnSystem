package com.university.lms.course.web;

import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.dto.*;
import com.university.lms.course.service.CoursePublishChecklistService;
import com.university.lms.course.service.CourseService;
import com.university.lms.course.service.CourseArchiveService;
import com.university.lms.course.service.CourseInsightsService;
import com.university.lms.course.service.CourseTemplateService;
import com.university.lms.course.service.EnrollmentService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** REST Controller for course management. */
@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
@Slf4j
public class CourseController {

  private final CourseService courseService;
  private final CourseArchiveService courseArchiveService;
  private final CourseInsightsService courseInsightsService;
  private final CourseTemplateService courseTemplateService;
  private final CoursePublishChecklistService coursePublishChecklistService;
  private final EnrollmentService enrollmentService;
  private final RequestUserContext requestUserContext;

  /** Get all courses with pagination. */
  @GetMapping({"", "/"})
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<PageResponse<CourseDto>> getAllCourses(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "createdAt") String sortBy,
      @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
    PageResponse<CourseDto> courses = courseService.getAllCourses(pageable);
    return ResponseEntity.ok(courses);
  }

  /** Get published courses. */
  @GetMapping("/published")
  public ResponseEntity<PageResponse<CourseDto>> getPublishedCourses(
      @RequestParam(required = false) CourseVisibility visibility,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

    if (visibility != null) {
      PageResponse<CourseDto> courses = courseService.getPublishedCourses(visibility, pageable);
      return ResponseEntity.ok(courses);
    } else {
      PageResponse<CourseDto> courses = courseService.getActiveCourses(pageable);
      return ResponseEntity.ok(courses);
    }
  }

  /** Search courses. */
  @GetMapping("/search")
  public ResponseEntity<PageResponse<CourseDto>> searchCourses(
      @RequestParam String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    Pageable pageable = PageRequest.of(page, size);
    PageResponse<CourseDto> courses = courseService.searchCourses(q, pageable);
    return ResponseEntity.ok(courses);
  }

  /** Get my courses (courses where user is enrolled). */
  @GetMapping("/my")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<PageResponse<CourseDto>> getMyCourses(
      @RequestParam(required = false) String role,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    UUID userId = requestUserContext.requireUserId();
    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

    PageResponse<CourseDto> courses;
    if (role != null) {
      courses = courseService.getCoursesForUserByRole(userId, role, pageable);
    } else {
      courses = courseService.getCoursesForUser(userId, pageable);
    }

    return ResponseEntity.ok(courses);
  }

  /** Get courses by owner. */
  @GetMapping("/owner/{ownerId}")
  @PreAuthorize("hasRole('SUPERADMIN')")
  public ResponseEntity<PageResponse<CourseDto>> getCoursesByOwner(
      @PathVariable UUID ownerId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    PageResponse<CourseDto> courses = courseService.getCoursesByOwner(ownerId, pageable);
    return ResponseEntity.ok(courses);
  }

  /** Get course by ID. */
  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseDto> getCourseById(@PathVariable UUID id) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseDto course = courseService.getCourseById(id, userId, userRole);
    return ResponseEntity.ok(course);
  }

  /** Public course preview (for elective landing page). */
  @GetMapping("/{id}/preview")
  public ResponseEntity<CoursePreviewDto> getCoursePreview(@PathVariable UUID id) {
    CoursePreviewDto preview = courseInsightsService.getCoursePreview(id);
    return ResponseEntity.ok(preview);
  }

  /** Aggregated instructor to-do list (ungraded, upcoming, missing). */
  @GetMapping("/teacher/todo")
  @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
  public ResponseEntity<TeacherTodoDashboardDto> getTeacherTodo(
      @RequestParam(required = false) UUID courseId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    TeacherTodoDashboardDto payload =
        courseInsightsService.getTeacherTodoDashboard(userId, userRole, courseId);
    return ResponseEntity.ok(payload);
  }

  /** Student contextual reminders feed. */
  @GetMapping("/student/reminders")
  @PreAuthorize("hasRole('STUDENT')")
  public ResponseEntity<StudentContextReminderFeedDto> getStudentContextReminders() {
    UUID userId = requestUserContext.requireUserId();
    StudentContextReminderFeedDto payload = courseInsightsService.getStudentContextReminders(userId);
    return ResponseEntity.ok(payload);
  }

  /** Get course syllabus by course ID. */
  @GetMapping("/{id}/syllabus")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseSyllabusDto> getCourseSyllabus(@PathVariable UUID id) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseSyllabusDto syllabus = courseService.getCourseSyllabus(id, userId, userRole);
    return ResponseEntity.ok(syllabus);
  }

  /** Get course by code. */
  @GetMapping("/code/{code}")
  public ResponseEntity<CourseDto> getCourseByCode(@PathVariable String code) {
    CourseDto course = courseService.getCourseByCode(code);
    return ResponseEntity.ok(course);
  }

  /** Create a new course. */
  @PostMapping({"", "/"})
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<CourseDto> createCourse(@Valid @RequestBody CreateCourseRequest request) {

    UUID ownerId = requestUserContext.requireUserId();
    CourseDto course = courseService.createCourse(request, ownerId);
    return ResponseEntity.status(HttpStatus.CREATED).body(course);
  }

  /** Clone course structure into a new semester/course shell. */
  @PostMapping("/{id}/clone-structure")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<CloneCourseStructureResultDto> cloneCourseStructure(
      @PathVariable UUID id, @Valid @RequestBody CloneCourseStructureRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CloneCourseStructureResultDto result =
        courseTemplateService.cloneCourseStructure(id, request, userId, userRole);
    return ResponseEntity.status(HttpStatus.CREATED).body(result);
  }

  /** Update a course. */
  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<CourseDto> updateCourse(
      @PathVariable UUID id, @Valid @RequestBody UpdateCourseRequest request) {

    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseDto course = courseService.updateCourse(id, request, userId, userRole);
    return ResponseEntity.ok(course);
  }

  /** Update syllabus for a course. */
  @PutMapping("/{id}/syllabus")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<CourseSyllabusDto> updateCourseSyllabus(
      @PathVariable UUID id, @Valid @RequestBody UpdateCourseSyllabusRequest request) {

    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseSyllabusDto syllabus = courseService.updateCourseSyllabus(id, request, userId, userRole);
    return ResponseEntity.ok(syllabus);
  }

  /** Delete a course. */
  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<Void> deleteCourse(@PathVariable UUID id) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    courseService.deleteCourse(id, userId, userRole);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/publish-checklist")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<CoursePublishChecklistDto> getPublishChecklist(@PathVariable UUID id) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CoursePublishChecklistDto checklist = coursePublishChecklistService.evaluate(id, userId, userRole);
    return ResponseEntity.ok(checklist);
  }

  /** Publish a course. */
  @PostMapping("/{id}/publish")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<?> publishCourse(
      @PathVariable UUID id, @RequestBody(required = false) PublishCourseRequest request) {

    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    CoursePublishChecklistDto checklist = coursePublishChecklistService.evaluate(id, userId, userRole);
    boolean forcePublish = request != null && Boolean.TRUE.equals(request.getForcePublish());

    if (!checklist.isReadyToPublish() && !forcePublish) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(
              PublishCourseBlockedResponse.builder()
                  .message("Course publish checklist is incomplete")
                  .checklist(checklist)
                  .build());
    }

    if (forcePublish
        && (request.getOverrideReason() == null || request.getOverrideReason().isBlank())) {
      return ResponseEntity.badRequest()
          .body(
              PublishCourseBlockedResponse.builder()
                  .message("Override reason is required when force publishing")
                  .checklist(checklist)
                  .build());
    }

    CourseDto course = courseService.publishCourse(id, userId, userRole);
    return ResponseEntity.ok(course);
  }

  /** Unpublish a course. */
  @PostMapping("/{id}/unpublish")
  @PreAuthorize("hasAnyRole('TEACHER','SUPERADMIN')")
  public ResponseEntity<CourseDto> unpublishCourse(@PathVariable UUID id) {

    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseDto course = courseService.unpublishCourse(id, userId, userRole);
    return ResponseEntity.ok(course);
  }

  /** Archive a course and capture content snapshot. */
  @PostMapping("/{id}/archive")
  @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
  public ResponseEntity<CourseDto> archiveCourse(@PathVariable UUID id) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseDto course = courseService.archiveCourse(id, userId, userRole);
    return ResponseEntity.ok(course);
  }

  /** Get latest archived content snapshot for course. */
  @GetMapping("/{id}/archive")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseArchiveSnapshotDto> getCourseArchive(@PathVariable UUID id) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseArchiveSnapshotDto snapshot = courseArchiveService.getLatestSnapshot(id, userId, userRole);
    return ResponseEntity.ok(snapshot);
  }

  /** Enroll user in course. */
  @PostMapping("/{courseId}/enroll")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseMemberDto> enrollUser(
      @PathVariable UUID courseId, @Valid @RequestBody EnrollUserRequest request) {

    UUID enrolledBy = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseMemberDto member = enrollmentService.enrollUser(courseId, request, enrolledBy, userRole);
    return ResponseEntity.status(HttpStatus.CREATED).body(member);
  }

  /** Unenroll user from course. */
  @DeleteMapping("/{courseId}/enroll/{userId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> unenrollUser(@PathVariable UUID courseId, @PathVariable UUID userId) {

    UUID requestedBy = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    enrollmentService.unenrollUser(courseId, userId, requestedBy, userRole);
    return ResponseEntity.noContent().build();
  }

  /** Drop enrollment (student self-drop). */
  @PostMapping("/{courseId}/drop")
  @PreAuthorize("hasRole('STUDENT')")
  public ResponseEntity<Void> dropEnrollment(@PathVariable UUID courseId) {

    UUID userId = requestUserContext.requireUserId();
    enrollmentService.dropEnrollment(courseId, userId);
    return ResponseEntity.noContent().build();
  }

  /** Get course members. */
  @GetMapping("/{courseId}/members")
  @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
  public ResponseEntity<PageResponse<CourseMemberDto>> getCourseMembers(
      @PathVariable UUID courseId,
      @RequestParam(required = false) String role,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {

    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "addedAt"));

    PageResponse<CourseMemberDto> members;
    if (role != null) {
      members =
          enrollmentService.getCourseMembers(
              courseId,
              role,
              pageable,
              requestUserContext.requireUserId(),
              requestUserContext.requireUserRole());
    } else {
      members =
          enrollmentService.getCourseMembers(
              courseId,
              pageable,
              requestUserContext.requireUserId(),
              requestUserContext.requireUserRole());
    }

    return ResponseEntity.ok(members);
  }

  /** Get user's enrollment in course. */
  @GetMapping("/{courseId}/enrollment")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseMemberDto> getMyEnrollment(@PathVariable UUID courseId) {

    UUID userId = requestUserContext.requireUserId();
    CourseMemberDto member =
        enrollmentService.getEnrollment(
            courseId, userId, userId, requestUserContext.requireUserRole());
    return ResponseEntity.ok(member);
  }

  /** Check if user is enrolled. */
  @GetMapping("/{courseId}/enrollment/check")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Boolean> checkEnrollment(@PathVariable UUID courseId) {

    UUID userId = requestUserContext.requireUserId();
    boolean enrolled = enrollmentService.isUserEnrolled(courseId, userId);
    return ResponseEntity.ok(enrolled);
  }

  /** Get student IDs by course ID. */
  @GetMapping("/{id}/students")
  @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
  public ResponseEntity<java.util.List<UUID>> getStudentIdsByCourseId(@PathVariable UUID id) {
    return ResponseEntity.ok(
        enrollmentService.getStudentIdsByCourseId(
            id, requestUserContext.requireUserId(), requestUserContext.requireUserRole()));
  }
}
