package com.university.lms.course.common.security;

import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.repository.CourseMemberRepository;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseAccessService {
  private final CourseMemberRepository courseMemberRepository;

  public CourseMember requireActiveMember(UUID courseId, UUID userId) {
    CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .orElseThrow(() -> ApiException.forbidden("You are not enrolled in this course"));
    if (!"active".equalsIgnoreCase(member.getEnrollmentStatus())) {
      throw ApiException.forbidden("Your course membership is not active");
    }
    return member;
  }

  public void requireStudent(UUID courseId, UUID userId) {
    CourseMember member = requireActiveMember(courseId, userId);
    if (!"STUDENT".equalsIgnoreCase(member.getRoleInCourse())) {
      throw ApiException.forbidden("Student course membership is required");
    }
  }

  public void requireTeacher(UUID courseId, UUID userId) {
    CourseMember member = requireActiveMember(courseId, userId);
    String role = member.getRoleInCourse().toUpperCase(Locale.ROOT);
    if (!role.equals("TEACHER") && !role.equals("TA") && !role.equals("ASSISTANT")) {
      throw ApiException.forbidden("Teacher course access is required");
    }
  }

  public boolean canTeach(UUID courseId, UUID userId) {
    return courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .filter(CourseMember::isActive)
        .map(member -> {
          String role = member.getRoleInCourse().toUpperCase(Locale.ROOT);
          return role.equals("TEACHER") || role.equals("TA") || role.equals("ASSISTANT");
        })
        .orElse(false);
  }
}
