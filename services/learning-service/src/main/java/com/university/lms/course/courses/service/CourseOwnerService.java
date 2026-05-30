package com.university.lms.course.courses.service;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.gradebook.service.UserProfileClient;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.service.CourseMapper;
import com.university.lms.course.web.RequestUserContext;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admin-only course owner reassignment. Lets an ADMIN hand an existing course to a new eligible
 * owner — the recovery path for courses orphaned when a teacher account is deleted/deactivated (see
 * {@code CourseService#deleteUserData}, which archives owned courses rather than cascade-deleting
 * them). Reassignment is strictly non-destructive: enrollments, members, modules, submissions,
 * grades and progress are untouched, and the course status is left as-is (an archived course is
 * never auto-published). Authorization is the canonical path — {@link CourseAccessService#requireAdmin()}
 * is the backend source of truth, identity comes from the JWT context, never the request body.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseOwnerService {

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseAccessService accessService;
  private final UserProfileClient userProfileClient;
  private final RequestUserContext requestUserContext;
  private final CourseMapper courseMapper;

  /**
   * Reassign a course's OWNER to {@code newOwnerId}. The course must exist, the new owner must be a
   * real, eligible (TEACHER or ADMIN) account, and exactly one active OWNER remains afterwards.
   */
  @Transactional
  @CacheEvict(value = "courses", allEntries = true)
  public CourseDto reassignOwner(UUID courseId, UUID newOwnerId) {
    accessService.requireAdmin();

    if (newOwnerId == null) {
      throw new ValidationException("New owner id is required");
    }

    Course course =
        courseRepository.findById(courseId).orElseThrow(() -> ApiException.notFound("Course"));

    // The prospective owner must be a real account that is allowed to own a course.
    UserProfileClient.UserProfile profile =
        userProfileClient
            .findProfile(newOwnerId)
            .orElseThrow(() -> new ValidationException("New owner does not exist"));
    String globalRole = profile.role();
    boolean eligible =
        "ADMIN".equalsIgnoreCase(globalRole) || "TEACHER".equalsIgnoreCase(globalRole);
    if (!eligible) {
      throw new ValidationException("New owner must be a TEACHER or ADMIN account");
    }

    // Demote any other active OWNER so that exactly one active OWNER remains. Demotion keeps the
    // person on the course as a TEACHER (their content/grades stay intact) — never a delete.
    List<CourseMember> currentOwners =
        courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, CourseRole.OWNER);
    for (CourseMember owner : currentOwners) {
      if (!owner.getUserId().equals(newOwnerId) && owner.isActive()) {
        owner.setRoleInCourse(CourseRole.TEACHER);
        courseMemberRepository.save(owner);
      }
    }

    // Upsert the new owner's membership as the single active OWNER (promote if already a member).
    CourseMember newOwner =
        courseMemberRepository
            .findByCourseIdAndUserId(courseId, newOwnerId)
            .orElseGet(
                () ->
                    CourseMember.builder()
                        .course(course)
                        .userId(newOwnerId)
                        .addedBy(requestUserContext.requireUserId())
                        .build());
    newOwner.setRoleInCourse(CourseRole.OWNER);
    newOwner.setStatus(CourseMemberStatus.ACTIVE);
    courseMemberRepository.save(newOwner);

    // Point the course at the new owner. Status is intentionally left unchanged — archived courses
    // stay archived (no auto-publish); the new owner restores/publishes via the normal lifecycle.
    course.setOwnerId(newOwnerId);
    Course saved = courseRepository.save(course);

    log.info("Course {} owner reassigned to {}", courseId, newOwnerId);
    return courseMapper.toDto(saved);
  }
}
