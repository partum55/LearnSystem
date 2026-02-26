package com.university.lms.course.service;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.dto.CourseMemberDto;
import com.university.lms.course.dto.EnrollUserRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing course enrollments and memberships. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentService {

  private static final String ROLE_STUDENT = "STUDENT";
  private static final String ENROLLMENT_ACTIVE = "active";
  private static final String ENROLLMENT_DROPPED = "dropped";
  private static final String ENROLLMENT_COMPLETED = "completed";
  private static final String ROLE_SUPERADMIN = "SUPERADMIN";

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseMapper courseMapper;
  private final JdbcTemplate jdbcTemplate;

  /** Enroll a user in a course. */
  @Transactional
  @CacheEvict(
      value = {"courses", "modules", "resources"},
      allEntries = true)
  public CourseMemberDto enrollUser(
      UUID courseId, EnrollUserRequest request, UUID enrolledBy, String requesterRole) {
    String targetRole = normalizeRole(request.getRoleInCourse());
    log.info(
        "Enrolling user {} in course {} with role {}", request.getUserId(), courseId, targetRole);

    Course course = findCourseById(courseId);
    enforceEnrollmentPermission(
        courseId, request.getUserId(), targetRole, enrolledBy, requesterRole);

    // Check if user is already enrolled
    if (courseMemberRepository.existsByCourseIdAndUserId(courseId, request.getUserId())) {
      throw new ValidationException("User is already enrolled in this course");
    }

    // Check capacity for students
    if (ROLE_STUDENT.equals(targetRole)) {
      if (!course.hasCapacity()) {
        throw new ValidationException("Course has reached maximum capacity");
      }
    }

    // Check if course is published for student enrollment
    if (ROLE_STUDENT.equals(targetRole) && !course.isActive()) {
      throw new ValidationException("Cannot enroll in unpublished course");
    }

    CourseMember member =
        CourseMember.builder()
            .course(course)
            .userId(request.getUserId())
            .roleInCourse(targetRole)
            .addedBy(enrolledBy)
            .enrollmentStatus(ENROLLMENT_ACTIVE)
            .build();

    CourseMember savedMember = courseMemberRepository.save(member);
    log.info("User {} enrolled successfully in course {}", request.getUserId(), courseId);

    CourseMemberDto dto = courseMapper.toDto(savedMember);
    enrichWithUserInfo(List.of(dto));
    return dto;
  }

  /** Unenroll a user from a course. */
  @Transactional
  @CacheEvict(
      value = {"courses", "modules", "resources"},
      allEntries = true)
  public void unenrollUser(UUID courseId, UUID userId, UUID requestedBy, String requesterRole) {
    log.info("Unenrolling user {} from course {}", userId, courseId);

    CourseMember member =
        courseMemberRepository
            .findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

    // Check permissions - user can unenroll themselves, or instructors can unenroll others
    if (!userId.equals(requestedBy)
        && !courseMemberRepository.canUserManageCourse(courseId, requestedBy)
        && !isSuperAdmin(requesterRole)) {
      throw new ValidationException("You don't have permission to unenroll this user");
    }

    // Don't allow unenrolling course owner
    if (member.getCourse().getOwnerId().equals(userId)) {
      throw new ValidationException("Cannot unenroll course owner");
    }

    courseMemberRepository.delete(member);
    log.info("User {} unenrolled successfully from course {}", userId, courseId);
  }

  /** Drop enrollment (student initiated). */
  @Transactional
  @CacheEvict(
      value = {"courses", "modules", "resources"},
      allEntries = true)
  public void dropEnrollment(UUID courseId, UUID userId) {
    log.info("User {} dropping enrollment from course {}", userId, courseId);

    CourseMember member =
        courseMemberRepository
            .findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

    if (!ROLE_STUDENT.equals(member.getRoleInCourse())) {
      throw new ValidationException("Only students can drop enrollment");
    }

    member.setEnrollmentStatus(ENROLLMENT_DROPPED);
    courseMemberRepository.save(member);

    log.info("User {} dropped enrollment from course {}", userId, courseId);
  }

  /** Complete enrollment. */
  @Transactional
  @CacheEvict(
      value = {"courses", "modules", "resources"},
      allEntries = true)
  public void completeEnrollment(UUID courseId, UUID userId) {
    log.info("Completing enrollment for user {} in course {}", userId, courseId);

    CourseMember member =
        courseMemberRepository
            .findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

    member.setEnrollmentStatus(ENROLLMENT_COMPLETED);
    member.setCompletionDate(LocalDateTime.now());
    courseMemberRepository.save(member);

    log.info("Enrollment completed for user {} in course {}", userId, courseId);
  }

  /** Get course members. */
  public PageResponse<CourseMemberDto> getCourseMembers(
      UUID courseId, Pageable pageable, UUID requesterId, String requesterRole) {
    log.debug("Fetching members for course: {}", courseId);

    // Verify course exists
    findCourseById(courseId);
    enforceViewMembersPermission(courseId, requesterId, requesterRole);

    Page<CourseMember> memberPage = courseMemberRepository.findByCourseId(courseId, pageable);
    return mapToPageResponse(memberPage);
  }

  /** Get course members by role. */
  public PageResponse<CourseMemberDto> getCourseMembers(
      UUID courseId, String role, Pageable pageable, UUID requesterId, String requesterRole) {
    String normalizedRole = normalizeRole(role);
    log.debug("Fetching members for course: {} with role: {}", courseId, normalizedRole);

    // Verify course exists
    findCourseById(courseId);
    enforceViewMembersPermission(courseId, requesterId, requesterRole);

    Page<CourseMember> memberPage =
        courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, normalizedRole, pageable);
    return mapToPageResponse(memberPage);
  }

  /** Get user's enrollments. */
  public PageResponse<CourseMemberDto> getUserEnrollments(UUID userId, Pageable pageable) {
    log.debug("Fetching enrollments for user: {}", userId);

    Page<CourseMember> memberPage = courseMemberRepository.findByUserId(userId, pageable);
    return mapToPageResponse(memberPage);
  }

  /** Get user's active enrollments. */
  public PageResponse<CourseMemberDto> getUserActiveEnrollments(UUID userId, Pageable pageable) {
    log.debug("Fetching active enrollments for user: {}", userId);

    Page<CourseMember> memberPage =
        courseMemberRepository.findActiveEnrollmentsForUser(userId, pageable);
    return mapToPageResponse(memberPage);
  }

  /** Check if user is enrolled in course. */
  public boolean isUserEnrolled(UUID courseId, UUID userId) {
    return courseMemberRepository.existsByCourseIdAndUserId(courseId, userId);
  }

  /** Get user's enrollment in a course. */
  public CourseMemberDto getEnrollment(
      UUID courseId, UUID userId, UUID requesterId, String requesterRole) {
    log.debug("Fetching enrollment for user {} in course {}", userId, courseId);
    if (!userId.equals(requesterId)
        && !courseMemberRepository.canUserManageCourse(courseId, requesterId)
        && !isSuperAdmin(requesterRole)) {
      throw new ValidationException("You don't have permission to view this enrollment");
    }

    CourseMember member =
        courseMemberRepository
            .findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

    CourseMemberDto dto = courseMapper.toDto(member);
    enrichWithUserInfo(List.of(dto));
    return dto;
  }

  public List<UUID> getStudentIdsByCourseId(UUID courseId, UUID requesterId, String requesterRole) {
    enforceViewMembersPermission(courseId, requesterId, requesterRole);
    return courseMemberRepository.findStudentIdsByCourseId(courseId);
  }

  // Helper methods
  private Course findCourseById(UUID courseId) {
    return courseRepository
        .findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
  }

  private void enforceEnrollmentPermission(
      UUID courseId, UUID targetUserId, String targetRole, UUID requesterId, String requesterRole) {
    boolean isSelfEnrollment = requesterId.equals(targetUserId);
    boolean isInstructor = courseMemberRepository.canUserManageCourse(courseId, requesterId);
    boolean isAdmin = isSuperAdmin(requesterRole);

    if (isAdmin || isInstructor) {
      return;
    }

    if (!isSelfEnrollment) {
      throw new ValidationException("Only instructors or admins can enroll other users");
    }

    if (!ROLE_STUDENT.equals(targetRole)) {
      throw new ValidationException("Self-enrollment is only permitted for students");
    }
  }

  private void enforceViewMembersPermission(UUID courseId, UUID requesterId, String requesterRole) {
    if (isSuperAdmin(requesterRole)) {
      return;
    }
    if (!courseMemberRepository.canUserManageCourse(courseId, requesterId)) {
      throw new ValidationException("You don't have permission to view course members");
    }
  }

  private boolean isSuperAdmin(String requesterRole) {
    return ROLE_SUPERADMIN.equalsIgnoreCase(requesterRole);
  }

  private String normalizeRole(String role) {
    if (role == null || role.isBlank()) {
      throw new ValidationException("Role is required");
    }
    return role.trim().toUpperCase();
  }

  private PageResponse<CourseMemberDto> mapToPageResponse(Page<CourseMember> page) {
    List<CourseMemberDto> dtos = page.getContent().stream().map(courseMapper::toDto).toList();
    enrichWithUserInfo(dtos);
    return PageResponse.<CourseMemberDto>builder()
        .content(dtos)
        .pageNumber(page.getNumber())
        .pageSize(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .last(page.isLast())
        .build();
  }

  /**
   * Batch-fetches user display names and emails from the users table
   * and enriches the member DTOs.
   */
  private void enrichWithUserInfo(List<CourseMemberDto> dtos) {
    if (dtos == null || dtos.isEmpty()) {
      return;
    }

    Set<UUID> userIds = dtos.stream()
        .map(CourseMemberDto::getUserId)
        .collect(Collectors.toSet());

    Map<UUID, String[]> userInfoMap = fetchUserInfo(userIds);

    for (CourseMemberDto dto : dtos) {
      String[] info = userInfoMap.get(dto.getUserId());
      if (info != null) {
        dto.setUserName(info[0]);
        dto.setUserEmail(info[1]);
      } else {
        dto.setUserName("Unknown User");
        dto.setUserEmail("");
      }
    }
  }

  /**
   * Queries the shared users table to get display names and emails for a set of user IDs.
   */
  private Map<UUID, String[]> fetchUserInfo(Set<UUID> userIds) {
    if (userIds.isEmpty()) {
      return Map.of();
    }

    try {
      String placeholders = userIds.stream().map(id -> "?").collect(Collectors.joining(","));
      String sql = "SELECT id, COALESCE(display_name, CONCAT(first_name, ' ', last_name), email) as name, email "
          + "FROM users WHERE id IN (" + placeholders + ")";

      Object[] params = userIds.toArray();

      Map<UUID, String[]> result = new HashMap<>();
      jdbcTemplate.query(sql, rs -> {
        UUID id = UUID.fromString(rs.getString("id"));
        String name = rs.getString("name");
        String email = rs.getString("email");
        result.put(id, new String[]{name, email});
      }, params);

      return result;
    } catch (Exception e) {
      log.warn("Failed to fetch user info from users table: {}", e.getMessage());
      return Map.of();
    }
  }
}
