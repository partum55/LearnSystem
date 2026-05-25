package com.university.lms.course.courses.controller;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.courses.service.CanonicalCourseMemberService;
import com.university.lms.course.dto.*;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.List;
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

  private final CanonicalCourseMemberService memberService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<PageResponse<CourseMemberDto>> getCourseMembers(
      @PathVariable UUID courseId,
      @RequestParam(required = false) String role,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "addedAt") String sortBy,
      @RequestParam(defaultValue = "DESC") Sort.Direction direction) {
    UUID userId = requestUserContext.requireUserId();
    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
    PageResponse<CourseMemberDto> members = memberService.list(
        courseId,
        memberService.parseRole(role),
        pageable,
        userId);
    return ResponseEntity.ok(members);
  }

  @PostMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseMemberDto> enrollCourseMember(
      @PathVariable UUID courseId, @Valid @RequestBody EnrollUserRequest request) {
    UUID enrolledBy = requestUserContext.requireUserId();
    CourseMemberDto member = memberService.upsert(courseId, request, enrolledBy);
    return ResponseEntity.status(HttpStatus.CREATED).body(member);
  }

  @DeleteMapping("/{userId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> unenrollCourseMember(@PathVariable UUID courseId, @PathVariable UUID userId) {
    UUID requestedBy = requestUserContext.requireUserId();
    memberService.delete(courseId, userId, requestedBy);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{userId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CourseMemberDto> updateCourseMemberRole(
      @PathVariable UUID courseId,
      @PathVariable UUID userId,
      @Valid @RequestBody EnrollUserRequest request) {
    UUID requestedBy = requestUserContext.requireUserId();
    EnrollUserRequest updateRequest = EnrollUserRequest.builder()
        .userId(userId)
        .roleInCourse(request.getRoleInCourse())
        .build();
    CourseMemberDto member = memberService.upsert(courseId, updateRequest, requestedBy);
    return ResponseEntity.ok(member);
  }

  @PostMapping("/bulk/preview")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<BulkPreviewResponse> bulkPreview(
      @PathVariable UUID courseId, @Valid @RequestBody BulkPreviewRequest request) {
    UUID requestedBy = requestUserContext.requireUserId();
    return ResponseEntity.ok(memberService.bulkPreview(courseId, request, requestedBy));
  }

  @PostMapping("/bulk/confirm")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<CourseMemberDto>> bulkConfirm(
      @PathVariable UUID courseId, @Valid @RequestBody BulkConfirmRequest request) {
    UUID requestedBy = requestUserContext.requireUserId();
    return ResponseEntity.ok(memberService.bulkConfirm(courseId, request, requestedBy));
  }
}
