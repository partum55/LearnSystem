package com.university.lms.course.web;

import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.repository.CourseMemberRepository;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/internal/courses")
@RequiredArgsConstructor
public class InternalCourseRoleController {

  private final CourseMemberRepository courseMemberRepository;

  @GetMapping("/{courseId}/members/{userId}/role")
  public ResponseEntity<Map<String, String>> getActiveCourseRole(
      @PathVariable UUID courseId,
      @PathVariable UUID userId) {
    return courseMemberRepository.findByCourseIdAndUserId(courseId, userId)
        .filter(member -> member.getStatus() == CourseMemberStatus.ACTIVE)
        .map(CourseMember::getRoleInCourse)
        .map(role -> ResponseEntity.ok(Map.of("role", role.name())))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}
