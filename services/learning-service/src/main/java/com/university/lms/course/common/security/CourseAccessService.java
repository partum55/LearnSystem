package com.university.lms.course.common.security;

import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseRole;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.web.RequestUserContext;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseAccessService {
  private final CourseMemberRepository courseMemberRepository;
  private final RequestUserContext requestUserContext;

  private boolean isAdmin() {
    try {
      String role = requestUserContext.requireUserRole();
      return "ADMIN".equalsIgnoreCase(role);
    } catch (Exception e) {
      return false;
    }
  }

  public CourseMember requireActiveMember(UUID courseId, UUID userId) {
    java.util.Optional<CourseMember> memberOpt = courseMemberRepository.findByCourseIdAndUserId(courseId, userId);
    if (memberOpt.isPresent()) {
      CourseMember member = memberOpt.get();
      if (!member.isActive()) {
        throw ApiException.forbidden("Your course membership is not active");
      }
      return member;
    }

    throw ApiException.forbidden("You are not enrolled in this course");
  }

  public CourseAccessContext requireCourseAccess(UUID courseId, UUID userId) {
    java.util.Optional<CourseMember> memberOpt = courseMemberRepository.findByCourseIdAndUserId(courseId, userId);
    if (memberOpt.isPresent()) {
      CourseMember member = memberOpt.get();
      if (!member.isActive() && !isAdmin()) {
        throw ApiException.forbidden("Your course membership is not active");
      }
      return CourseAccessContext.member(userId, requestUserContext.requireUserRole(), member.getRoleInCourse());
    }
    if (isAdmin()) {
      return CourseAccessContext.adminOverride(userId);
    }
    throw ApiException.forbidden("You are not enrolled in this course");
  }

  public void requireStudent(UUID courseId, UUID userId) {
    // Admins must be explicitly enrolled as STUDENT to perform student-only actions
    CourseMember member = requireActiveMember(courseId, userId);
    if (member.getRoleInCourse() != CourseRole.STUDENT) {
      throw ApiException.forbidden("Student course membership is required");
    }
  }

  public void requireTeacher(UUID courseId, UUID userId) {
    if (isAdmin()) {
      return; // Platform admin override context
    }
    CourseMember member = requireActiveMember(courseId, userId);
    CourseRole role = member.getRoleInCourse();
    if (role == null || (role != CourseRole.TEACHER && role != CourseRole.TA && role != CourseRole.OWNER)) {
      throw ApiException.forbidden("Teacher course access is required");
    }
  }

  public boolean canTeach(UUID courseId, UUID userId) {
    if (isAdmin()) {
      return true; // Platform admin override context
    }
    return courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .filter(CourseMember::isActive)
        .map(member -> {
          CourseRole role = member.getRoleInCourse();
          return role != null && (role == CourseRole.TEACHER || role == CourseRole.TA || role == CourseRole.OWNER);
        })
        .orElse(false);
  }

  public void requireCanEnroll(UUID courseId, UUID targetUserId, CourseRole targetRole) {
    UUID requesterId = requestUserContext.requireUserId();
    boolean isSelfEnrollment = requesterId.equals(targetUserId);
    boolean isOwner = canOwn(courseId, requesterId);
    boolean isAdmin = isAdmin();

    if (isAdmin || isOwner) {
      return;
    }

    if (!isSelfEnrollment) {
      throw ApiException.forbidden("Only instructors or admins can enroll other users");
    }

    if (targetRole != CourseRole.STUDENT) {
      throw ApiException.forbidden("Self-enrollment is only permitted for students");
    }
  }

  public void requireCanUnenroll(UUID courseId, UUID targetUserId) {
    UUID requesterId = requestUserContext.requireUserId();
    boolean isSelfUnenrollment = requesterId.equals(targetUserId);
    boolean isOwner = canOwn(courseId, requesterId);
    boolean isAdmin = isAdmin();

    if (isAdmin || isOwner || isSelfUnenrollment) {
      return;
    }

    throw ApiException.forbidden("You don't have permission to unenroll this user");
  }

  public void requireCanViewMembers(UUID courseId) {
    UUID requesterId = requestUserContext.requireUserId();
    if (isAdmin() || canTeach(courseId, requesterId)) {
      return;
    }
    throw ApiException.forbidden("You don't have permission to view course members");
  }

  public void requireCanViewEnrollment(UUID courseId, UUID userId) {
    UUID requesterId = requestUserContext.requireUserId();
    boolean isSelf = userId.equals(requesterId);
    if (isAdmin() || canTeach(courseId, requesterId) || isSelf) {
      return;
    }
    throw ApiException.forbidden("You don't have permission to view this enrollment");
  }

  public void requireOwnerOrAdmin(UUID courseId, UUID userId) {
    if (isAdmin()) {
      return;
    }
    if (canOwn(courseId, userId)) {
      return;
    }
    throw ApiException.forbidden("Course owner access is required");
  }

  public boolean canOwn(UUID courseId, UUID userId) {
    return courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .filter(CourseMember::isActive)
        .map(member -> member.getRoleInCourse() == CourseRole.OWNER)
        .orElse(false);
  }
}
