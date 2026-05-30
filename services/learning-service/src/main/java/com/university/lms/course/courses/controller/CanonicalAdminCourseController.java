package com.university.lms.course.courses.controller;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.courses.service.CourseOwnerService;
import com.university.lms.course.dto.CourseDto;
import com.university.lms.course.dto.CreateCourseRequest;
import com.university.lms.course.dto.ReassignOwnerRequest;
import com.university.lms.course.dto.UpdateCourseRequest;
import com.university.lms.course.service.CourseService;
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
@RequestMapping("/v1/admin/courses")
@RequiredArgsConstructor
public class CanonicalAdminCourseController {

  private final CourseService courseService;
  private final CourseOwnerService courseOwnerService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<PageResponse<CourseDto>> getAdminCourses(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "createdAt") String sortBy,
      @RequestParam(defaultValue = "DESC") Sort.Direction direction) {
    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
    PageResponse<CourseDto> courses = courseService.getAllCourses(pageable);
    return ResponseEntity.ok(courses);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<CourseDto> adminCreateCourse(@Valid @RequestBody CreateCourseRequest request) {
    UUID ownerId = requestUserContext.requireUserId();
    CourseDto course = courseService.createCourse(request, ownerId, requestUserContext.requireUserRole());
    return ResponseEntity.status(HttpStatus.CREATED).body(course);
  }

  @GetMapping("/{courseId}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<CourseDto> adminGetCourseById(@PathVariable UUID courseId) {
    UUID userId = requestUserContext.requireUserId();
    CourseDto course = courseService.getCourseById(courseId, userId);
    return ResponseEntity.ok(course);
  }

  @PatchMapping("/{courseId}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<CourseDto> adminUpdateCourse(
      @PathVariable UUID courseId, @Valid @RequestBody UpdateCourseRequest request) {
    UUID userId = requestUserContext.requireUserId();
    CourseDto course = courseService.updateCourse(courseId, request, userId);
    return ResponseEntity.ok(course);
  }

  @PostMapping("/{courseId}/archive")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<CourseDto> adminArchiveCourse(@PathVariable UUID courseId) {
    UUID userId = requestUserContext.requireUserId();
    CourseDto course = courseService.archiveCourse(courseId, userId);
    return ResponseEntity.ok(course);
  }

  @PostMapping("/{courseId}/reassign-owner")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<CourseDto> adminReassignOwner(
      @PathVariable UUID courseId, @Valid @RequestBody ReassignOwnerRequest request) {
    CourseDto course = courseOwnerService.reassignOwner(courseId, request.getNewOwnerId());
    return ResponseEntity.ok(course);
  }
}
