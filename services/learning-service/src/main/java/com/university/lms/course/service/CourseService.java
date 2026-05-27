package com.university.lms.course.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.dto.*;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import java.time.LocalDate;
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
    enforceCourseVisibility(course, userId, userRole);
    return courseMapper.toDto(course);
  }

  /** Get syllabus for a course. */
  public CourseSyllabusDto getCourseSyllabus(UUID id, UUID userId, String userRole) {
    Course course = findCourseById(id);
    enforceCourseVisibility(course, userId, userRole);
    return CourseSyllabusDto.builder()
        .courseId(course.getId())
        .syllabus(course.getSyllabus())
        .updatedAt(course.getUpdatedAt())
        .build();
  }

  /** Get course by code. */
  @Cacheable(value = "courses", key = "#code")
  public CourseDto getCourseByCode(String code) {
    log.debug("Fetching course by code: {}", code);
    Course course =
        courseRepository
            .findByCode(code)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "code", code));

    if (!course.isActive()) {
      throw new ValidationException("Course is not available");
    }
    return courseMapper.toDto(course);
  }

  /** Get all courses with pagination. */
  public PageResponse<CourseDto> getAllCourses(Pageable pageable) {
    log.debug("Fetching all courses with pagination");
    Page<Course> coursePage = courseRepository.findAll(pageable);
    return mapToPageResponse(coursePage);
  }

  /** Get published courses. */
  public PageResponse<CourseDto> getPublishedCourses(
      CourseVisibility visibility, Pageable pageable) {
    log.debug("Fetching published courses with visibility: {}", visibility);
    Page<Course> coursePage =
        courseRepository.findByStatusAndVisibility(CourseStatus.PUBLISHED, visibility, pageable);
    return mapToPageResponse(coursePage);
  }

  /** Get active courses. */
  public PageResponse<CourseDto> getActiveCourses(Pageable pageable) {
    log.debug("Fetching active courses");
    Page<Course> coursePage = courseRepository.findActiveCourses(CourseStatus.PUBLISHED, pageable);
    return mapToPageResponse(coursePage);
  }

  /** Search courses by term. */
  public PageResponse<CourseDto> searchCourses(String searchTerm, Pageable pageable) {
    log.debug("Searching courses with term: {}", searchTerm);
    Page<Course> coursePage = courseRepository.searchCourses(searchTerm, pageable);
    return mapToPageResponse(coursePage);
  }

  /** Get courses by owner. */
  public PageResponse<CourseDto> getCoursesByOwner(UUID ownerId, Pageable pageable) {
    log.debug("Fetching courses for owner: {}", ownerId);
    Page<Course> coursePage = courseRepository.findByOwnerId(ownerId, pageable);
    return mapToPageResponse(coursePage);
  }

  /** Get courses for user (enrolled courses). */
  public PageResponse<CourseDto> getCoursesForUser(UUID userId, Pageable pageable) {
    log.debug("Fetching courses for user: {}", userId);
    Page<Course> coursePage = courseRepository.findCoursesForUser(userId, pageable);
    return mapToPageResponse(coursePage);
  }

  /** Get courses for user by role. */
  public PageResponse<CourseDto> getCoursesForUserByRole(
      UUID userId, String role, Pageable pageable) {
    String normalizedRole = normalizeRole(role);
    log.debug("Fetching courses for user: {} with role: {}", userId, normalizedRole);
    Page<Course> coursePage =
        courseRepository.findCoursesForUserByRole(userId, normalizedRole, pageable);
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

  /** Update syllabus for a course. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseSyllabusDto updateCourseSyllabus(
      UUID id, UpdateCourseSyllabusRequest request, UUID userId, String userRole) {
    log.info("Updating syllabus for course: {} by user: {}", id, userId);

    Course course = findCourseById(id);
    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    course.setSyllabus(request.getSyllabus());
    Course updatedCourse = courseRepository.save(course);
    return CourseSyllabusDto.builder()
        .courseId(updatedCourse.getId())
        .syllabus(updatedCourse.getSyllabus())
        .updatedAt(updatedCourse.getUpdatedAt())
        .build();
  }

  /** Delete a course. */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public void deleteCourse(UUID id, UUID userId, String userRole) {
    log.info("Deleting course: {} by user: {}", id, userId);

    Course course = findCourseById(id);

    if (!canUserAdministerCourse(course.getId(), userId, userRole)) {
      throw new AccessDeniedException("Course owner or ADMIN access is required");
    }

    course.setStatus(CourseStatus.ARCHIVED);
    courseRepository.save(course);
    log.info("Course soft-deleted by archiving: {}", id);
  }

  /**
   * Delete all course-related data for the given user. This includes courses owned by the user and
   * all user enrollments.
   */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public void deleteUserData(UUID userId) {
    log.info("Deleting course data for user: {}", userId);

    long deletedCourses = courseRepository.deleteByOwnerId(userId);
    long deletedMemberships = courseMemberRepository.deleteByUserId(userId);

    log.info(
        "Deleted course data for user {}: courses={}, memberships={}",
        userId,
        deletedCourses,
        deletedMemberships);
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

    if (course.getStatus() != CourseStatus.ARCHIVED) {
      course.setStatus(CourseStatus.ARCHIVED);
      
      course = courseRepository.save(course);
    }
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
    if (request.getVisibility() != null) {
      course.setVisibility(request.getVisibility());
    }
    if (request.getStatus() != null) {
      course.setStatus(request.getStatus());
    }

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

  private boolean canUserManageCourse(Course course, UUID userId, String userRole) {
    if (isAdmin(userRole)) {
      return true;
    }

    // Check actual course membership. Global TEACHER does not grant access.
    return courseMemberRepository.canUserManageCourse(course.getId(), userId);
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

  private void enforceCourseVisibility(Course course, UUID userId, String userRole) {
    boolean isAdmin = isAdmin(userRole);
    boolean canManage = canUserManageCourse(course, userId, userRole);

    if (course.getStatus() == CourseStatus.PUBLISHED) {
      return;
    }

    if (!isAdmin && !canManage) {
      throw new ValidationException("Course is not available");
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

  private String normalizeRole(String role) {
    if (role == null || role.isBlank()) {
      throw new ValidationException("Role is required");
    }
    return role.trim().toUpperCase();
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
        .visibility(course.getVisibility())
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
