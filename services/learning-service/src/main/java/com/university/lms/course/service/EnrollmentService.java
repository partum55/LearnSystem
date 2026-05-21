package com.university.lms.course.service;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.dto.CourseMemberDto;
import com.university.lms.course.dto.EnrollUserRequest;
import com.university.lms.course.gradebook.service.UserProfileClient;
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
  private static final String ROLE_ADMIN = "ADMIN";
  private static final String ROLE_TEACHER = "TEACHER";
  private static final Set<String> COURSE_ROLES = Set.of("OWNER", "TEACHER", "TA", "STUDENT");

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseMapper courseMapper;
  private final CourseAccessService courseAccessService;
  private final UserProfileClient userProfileClient;

  /** Enroll a user in a course. */
  @Transactional
  @CacheEvict(
      value = {"courses", "modules", "resources"},
      allEntries = true)
  public CourseMemberDto enrollUser(
      UUID courseId, EnrollUserRequest request, UUID enrolledBy, String requesterRole) {
    String targetRole = normalizeRole(request.getRoleInCourse());
    if (!COURSE_ROLES.contains(targetRole)) {
      throw new ValidationException("Invalid role in course: " + targetRole);
    }

    log.info(
        "Enrolling user {} in course {} with role {}", request.getUserId(), courseId, targetRole);

    Course course = findCourseById(courseId);
    courseAccessService.requireCanEnroll(courseId, request.getUserId(), targetRole);

    validateTargetGlobalRole(request.getUserId(), targetRole);

    java.util.Optional<CourseMember> existingMemberOpt = courseMemberRepository.findByCourseIdAndUserId(courseId, request.getUserId());
    CourseMember savedMember;
    if (existingMemberOpt.isPresent()) {
      CourseMember existingMember = existingMemberOpt.get();
      existingMember.setRoleInCourse(targetRole);
      existingMember.setAddedBy(enrolledBy);
      existingMember.setEnrollmentStatus(ENROLLMENT_ACTIVE);
      savedMember = courseMemberRepository.save(existingMember);
      log.info("User {} course membership updated successfully in course {} to role {}", request.getUserId(), courseId, targetRole);
    } else {
      // Check capacity for students
      if (ROLE_STUDENT.equals(targetRole) && !isAdmin(requesterRole)) {
        if (!course.hasCapacity()) {
          throw new ValidationException("Course has reached maximum capacity");
        }
      }

      // Check if course is published for student enrollment
      if (ROLE_STUDENT.equals(targetRole) && !isAdmin(requesterRole) && !course.isActive()) {
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

      savedMember = courseMemberRepository.save(member);
      log.info("User {} enrolled successfully in course {}", request.getUserId(), courseId);
    }

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

    courseAccessService.requireCanUnenroll(courseId, userId);

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
    courseAccessService.requireCanViewMembers(courseId);

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
    courseAccessService.requireCanViewMembers(courseId);

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
    courseAccessService.requireCanViewEnrollment(courseId, userId);

    CourseMember member =
        courseMemberRepository
            .findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found"));

    CourseMemberDto dto = courseMapper.toDto(member);
    enrichWithUserInfo(List.of(dto));
    return dto;
  }

  public List<UUID> getStudentIdsByCourseId(UUID courseId, UUID requesterId, String requesterRole) {
    courseAccessService.requireCanViewMembers(courseId);
    return courseMemberRepository.findStudentIdsByCourseId(courseId);
  }

  // Helper methods
  private Course findCourseById(UUID courseId) {
    return courseRepository
        .findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
  }

  private String normalizeRole(String role) {
    if (role == null || role.isBlank()) {
      throw new ValidationException("Role is required");
    }
    return role.trim().toUpperCase();
  }

  private boolean isAdmin(String role) {
    return ROLE_ADMIN.equalsIgnoreCase(role);
  }

  private void validateTargetGlobalRole(UUID targetUserId, String targetCourseRole) {
    UserProfileClient.UserProfile profile = userProfileClient.findProfile(targetUserId)
        .orElseThrow(() -> new ValidationException("Failed to verify user profile for enrollment"));
    String globalRole = normalizeGlobalRole(profile.role());

    if ("OWNER".equals(targetCourseRole) || "TEACHER".equals(targetCourseRole)) {
      if (!ROLE_TEACHER.equals(globalRole) && !ROLE_ADMIN.equals(globalRole)) {
        throw new ValidationException("User must have global TEACHER or ADMIN role to be assigned course OWNER or TEACHER");
      }
      return;
    }

    if (!ROLE_ADMIN.equals(globalRole) && !ROLE_TEACHER.equals(globalRole) && !"USER".equals(globalRole)) {
      throw new ValidationException("Unsupported global role for course membership");
    }
  }

  private String normalizeGlobalRole(String role) {
    if (role == null || role.isBlank()) {
      return "USER";
    }
    String normalized = role.trim().toUpperCase();
    return normalized;
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

  private void enrichWithUserInfo(List<CourseMemberDto> dtos) {
    if (dtos == null || dtos.isEmpty()) {
      return;
    }

    for (CourseMemberDto dto : dtos) {
      userProfileClient.findProfile(dto.getUserId()).ifPresentOrElse(
          profile -> {
            dto.setUserName(profile.displayName());
            dto.setUserEmail(profile.email());
          },
          () -> {
            dto.setUserName("Unknown User");
            dto.setUserEmail("");
          }
      );
    }
  }
}
