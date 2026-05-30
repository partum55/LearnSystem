package com.university.lms.course.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.dto.*;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing courses. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseService {

  private static final String ROLE_ADMIN = "ADMIN";
  private static final String ROLE_TEACHER = "TEACHER";

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseMapper courseMapper;

  /** Get course by ID. */
  @Cacheable(
      value = "courses",
      key = "T(String).format('%s:%s:%s', #id, #userId, #userRole == null ? 'NONE' : #userRole)")
  public CourseDto getCourseById(UUID id, UUID userId, String userRole) {
    log.debug("Fetching course by ID: {}", id);
    Course course = findCourseById(id);
    enforceCourseAccess(course, userId, userRole);
    return courseMapper.toDto(course);
  }

  /** Get all courses with pagination. */
  public PageResponse<CourseDto> getAllCourses(Pageable pageable) {
    log.debug("Fetching all courses with pagination");
    Page<Course> coursePage = courseRepository.findAll(pageable);
    return mapToPageResponse(coursePage);
  }

  /** Create a new course. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto createCourse(CreateCourseRequest request, UUID ownerId, String requesterRole) {
    log.info("Creating new course with code: {} by owner: {}", request.getCode(), ownerId);

    if (!ROLE_ADMIN.equalsIgnoreCase(requesterRole) && !ROLE_TEACHER.equalsIgnoreCase(requesterRole)) {
      throw new ValidationException("Only ADMIN or global TEACHER accounts can create courses");
    }

    // Validate course code uniqueness
    if (courseRepository.existsByCode(request.getCode())) {
      throw new ValidationException("Course with code '" + request.getCode() + "' already exists");
    }

    // Validate dates
    validateDateRange(request.getStartDate(), request.getEndDate());

    Course course = courseMapper.toEntity(request, ownerId);
    Course savedCourse = courseRepository.save(course);

    if (ROLE_TEACHER.equalsIgnoreCase(requesterRole)) {
      addCourseMember(savedCourse, ownerId, com.university.lms.course.domain.CourseRole.OWNER, ownerId);
    }

    log.info("Course created successfully with ID: {}", savedCourse.getId());
    return courseMapper.toDto(savedCourse);
  }

  /** Update a course. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto updateCourse(
      UUID id, UpdateCourseRequest request, UUID userId, String userRole) {
    log.info("Updating course: {} by user: {}", id, userId);

    Course course = findCourseById(id);

    // Check permissions
    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    // Validate dates if both are provided
    LocalDate effectiveStartDate =
        request.getStartDate() != null ? request.getStartDate() : course.getStartDate();
    LocalDate effectiveEndDate =
        request.getEndDate() != null ? request.getEndDate() : course.getEndDate();
    validateDateRange(effectiveStartDate, effectiveEndDate);

    courseMapper.updateEntityFromDto(course, request);
    Course updatedCourse = courseRepository.save(course);

    log.info("Course updated successfully: {}", id);
    return courseMapper.toDto(updatedCourse);
  }

  /**
   * Delete a course. Safe-delete only: a course may be hard-deleted exclusively while it is still a
   * DRAFT with no enrolled students. Published or archived courses (which may carry student
   * submissions, grades and progress) must be archived instead of destroyed.
   */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public void deleteCourse(UUID id, UUID userId, String userRole) {
    log.info("Deleting course: {} by user: {}", id, userId);

    Course course = findCourseById(id);

    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    if (course.getStatus() != CourseStatus.DRAFT) {
      throw new ValidationException(
          "Only draft courses can be deleted. Archive published or archived courses instead.");
    }

    long activeStudents = courseMemberRepository.countActiveStudents(course.getId());
    if (activeStudents > 0) {
      throw new ValidationException(
          "Cannot delete a course with enrolled students. Archive the course instead.");
    }

    courseRepository.delete(course);
    log.info("Empty draft course deleted: {}", id);
  }

  /**
   * Remove a user's footprint from courses on account deletion without destroying other users'
   * data. Courses owned by the user are archived (not cascade-deleted) so that enrolled students
   * keep their submissions, grades and progress; only the departing user's own memberships are
   * removed.
   */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public void deleteUserData(UUID userId) {
    log.info("Removing course data for user: {}", userId);

    List<Course> ownedCourses = courseRepository.findByOwnerId(userId);
    int archived = 0;
    for (Course course : ownedCourses) {
      if (course.getStatus() != CourseStatus.ARCHIVED) {
        course.setStatus(CourseStatus.ARCHIVED);
        archived++;
      }
    }
    if (!ownedCourses.isEmpty()) {
      courseRepository.saveAll(ownedCourses);
    }

    long removedMemberships = courseMemberRepository.deleteByUserId(userId);

    log.info(
        "Cleaned course data for user {}: ownedCoursesArchived={}, membershipsRemoved={}",
        userId,
        archived,
        removedMemberships);
  }

  /** Publish a course. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto publishCourse(UUID id, UUID userId, String userRole) {
    log.info("Publishing course: {} by user: {}", id, userId);

    Course course = findCourseById(id);

    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    if (course.getStatus() != CourseStatus.DRAFT) {
      throw new ValidationException("Only draft courses can be published");
    }

    course.setStatus(CourseStatus.PUBLISHED);
    Course updatedCourse = courseRepository.save(course);

    log.info("Course published successfully: {}", id);
    return courseMapper.toDto(updatedCourse);
  }

  /** Unpublish a course. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto unpublishCourse(UUID id, UUID userId, String userRole) {
    log.info("Unpublishing course: {} by user: {}", id, userId);

    Course course = findCourseById(id);

    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    if (course.getStatus() != CourseStatus.PUBLISHED) {
      throw new ValidationException("Only published courses can be unpublished");
    }

    course.setStatus(CourseStatus.DRAFT);
    Course updatedCourse = courseRepository.save(course);

    log.info("Course unpublished successfully: {}", id);
    return courseMapper.toDto(updatedCourse);
  }

  /** Archive a course and capture immutable content snapshot. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto archiveCourse(UUID id, UUID userId, String userRole) {
    log.info("Archiving course: {} by user: {}", id, userId);

    Course course = findCourseById(id);
    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    if (course.getStatus() == CourseStatus.ARCHIVED) {
      return courseMapper.toDto(course);
    }

    course.setStatus(CourseStatus.ARCHIVED);
    course = courseRepository.save(course);
    log.info("Course archived successfully: {}", id);
    return courseMapper.toDto(course);
  }

  public CourseSettingsDto getCourseSettings(UUID id, UUID userId, String userRole) {
    Course course = findCourseById(id);
    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }
    return toSettingsDto(course);
  }

  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseSettingsDto updateCourseSettings(
      UUID id, UpdateCourseSettingsRequest request, UUID userId, String userRole) {
    Course course = findCourseById(id);
    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    String normalizedCode = normalizeRequired(request.getCode(), "Course code");
    String normalizedTitle = normalizeRequired(request.getTitleUk(), "Course title");
    courseRepository.findByCode(normalizedCode)
        .filter(existing -> !existing.getId().equals(course.getId()))
        .ifPresent(existing -> {
          throw new ValidationException("Course with code '" + normalizedCode + "' already exists");
        });

    course.setCode(normalizedCode);
    course.setTitleUk(normalizedTitle);
    course.setTitleEn(blankToNull(request.getTitleEn()));
    course.setDescriptionUk(blankToNull(request.getDescriptionUk()));
    course.setDescriptionEn(blankToNull(request.getDescriptionEn()));
    course.setSyllabus(blankToNull(request.getSyllabus()));

    return toSettingsDto(courseRepository.save(course));
  }

  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto restoreCourse(UUID id, UUID userId, String userRole) {
    Course course = findCourseById(id);
    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    if (course.getStatus() == CourseStatus.ARCHIVED) {
      course.setStatus(CourseStatus.DRAFT);
      course = courseRepository.save(course);
    }
    return courseMapper.toDto(course);
  }

  // Helper methods

  private Course findCourseById(UUID id) {
    return courseRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
  }

  private boolean isCourseOwner(UUID courseId, UUID userId) {
    return courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .filter(CourseMember::isActive)
        .map(CourseMember::isOwner)
        .orElse(false);
  }

  private boolean canUserAdministerCourse(UUID courseId, UUID userId, String userRole) {
    return isAdmin(userRole) || isCourseOwner(courseId, userId);
  }

  private void enforceCourseAccess(Course course, UUID userId, String userRole) {
    if (isAdmin(userRole)) {
      return;
    }

    CourseMember member =
        courseMemberRepository
            .findByCourseIdAndUserId(course.getId(), userId)
            .filter(CourseMember::isActive)
            .orElse(null);

    if (member == null) {
      throw ApiException.forbidden("You are not enrolled in this course");
    }

    if (member.getRoleInCourse() == com.university.lms.course.domain.CourseRole.STUDENT
        && course.getStatus() == CourseStatus.DRAFT) {
      throw ApiException.forbidden("This course is not available");
    }
  }

  private boolean isAdmin(String userRole) {
    return ROLE_ADMIN.equalsIgnoreCase(userRole);
  }

  private void addCourseMember(Course course, UUID userId, com.university.lms.course.domain.CourseRole role, UUID addedBy) {
    CourseMember member =
        CourseMember.builder()
            .course(course)
            .userId(userId)
            .roleInCourse(role)
            .addedBy(addedBy)
            .status(CourseMemberStatus.ACTIVE)
            .build();
    courseMemberRepository.save(member);
  }

  private void validateDateRange(LocalDate startDate, LocalDate endDate) {
    if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
      throw new ValidationException("End date must be after start date");
    }
  }

  private String normalizeRequired(String value, String label) {
    if (value == null || value.isBlank()) {
      throw new ValidationException(label + " is required");
    }
    return value.trim();
  }

  private String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private CourseSettingsDto toSettingsDto(Course course) {
    return CourseSettingsDto.builder()
        .id(course.getId())
        .code(course.getCode())
        .titleUk(course.getTitleUk())
        .titleEn(course.getTitleEn())
        .descriptionUk(course.getDescriptionUk())
        .descriptionEn(course.getDescriptionEn())
        .syllabus(course.getSyllabus())
        .status(course.getStatus())
        .ownerId(course.getOwnerId())
        .updatedAt(course.getUpdatedAt())
        .build();
  }

  private PageResponse<CourseDto> mapToPageResponse(Page<Course> page) {
    return PageResponse.<CourseDto>builder()
        .content(page.getContent().stream().map(courseMapper::toDto).toList())
        .pageNumber(page.getNumber())
        .pageSize(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .last(page.isLast())
        .build();
  }
}
