package com.university.lms.course.groups.controller;

import com.university.lms.course.dto.EnrollmentGroupDto;
import com.university.lms.course.groups.service.CourseGroupService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/courses/{courseId}/enrollment-groups")
@RequiredArgsConstructor
public class CourseGroupController {

  private final CourseGroupService courseGroupService;

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<EnrollmentGroupDto>> getCourseGroups(@PathVariable UUID courseId) {
    return ResponseEntity.ok(courseGroupService.listCourseGroups(courseId));
  }

  @PostMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> enrollGroupToCourse(
      @PathVariable UUID courseId, @RequestBody Map<String, String> payload) {
    String groupIdStr = payload.get("groupId");
    if (groupIdStr == null) {
      throw com.university.lms.course.common.error.ApiException.badRequest("INVALID_INPUT", "groupId is required");
    }
    UUID groupId = UUID.fromString(groupIdStr);
    courseGroupService.enrollGroupToCourse(courseId, groupId);
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  @DeleteMapping("/{groupId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> unenrollGroupFromCourse(
      @PathVariable UUID courseId, @PathVariable UUID groupId) {
    courseGroupService.unenrollGroupFromCourse(courseId, groupId);
    return ResponseEntity.noContent().build();
  }
}
