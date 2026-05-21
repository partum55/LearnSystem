package com.university.lms.course.courses.controller;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.dto.CourseMemberDto;
import com.university.lms.course.dto.EnrollUserRequest;
import com.university.lms.course.service.EnrollmentService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/courses/{courseId}/members")
@RequiredArgsConstructor
public class CanonicalCourseMemberController {

  private final EnrollmentService enrollmentService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<PageResponse<CourseMemberDto>> getCourseMembers(
      @PathVariable UUID courseId,
      @RequestParam(required = false) String role,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "createdAt") String sortBy,
      @RequestParam(defaultValue = "DESC") Sort.Direction direction) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
    PageResponse<CourseMemberDto> members;
    if (role != null && !role.isBlank()) {
      members = enrollmentService.getCourseMembers(courseId, role, pageable, userId, userRole);
    } else {
      members = enrollmentService.getCourseMembers(courseId, pageable, userId, userRole);
    }
    return ResponseEntity.ok(members);
  }

  @PostMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseMemberDto> enrollCourseMember(
      @PathVariable UUID courseId, @Valid @RequestBody EnrollUserRequest request) {
    UUID enrolledBy = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    CourseMemberDto member = enrollmentService.enrollUser(courseId, request, enrolledBy, userRole);
    return ResponseEntity.status(HttpStatus.CREATED).body(member);
  }

  @DeleteMapping("/{userId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> unenrollCourseMember(@PathVariable UUID courseId, @PathVariable UUID userId) {
    UUID requestedBy = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    enrollmentService.unenrollUser(courseId, userId, requestedBy, userRole);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{userId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseMemberDto> updateCourseMemberRole(
      @PathVariable UUID courseId,
      @PathVariable UUID userId,
      @Valid @RequestBody EnrollUserRequest request) {
    UUID requestedBy = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();
    EnrollUserRequest updateRequest = EnrollUserRequest.builder()
        .userId(userId)
        .roleInCourse(request.getRoleInCourse())
        .build();
    CourseMemberDto member = enrollmentService.enrollUser(courseId, updateRequest, requestedBy, userRole);
    return ResponseEntity.ok(member);
  }
}
