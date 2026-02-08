package com.university.lms.course.web;

import com.university.lms.course.service.CourseService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Internal API for cross-service cleanup operations. */
@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
@Slf4j
public class InternalCourseController {

  private final CourseService courseService;

  /** Delete all course-related data for a user. */
  @DeleteMapping("/{userId}/data")
  @PreAuthorize("hasRole('SUPERADMIN')")
  public ResponseEntity<Void> deleteUserData(@PathVariable UUID userId) {
    log.info("Internal request to delete course data for user: {}", userId);
    courseService.deleteUserData(userId);
    return ResponseEntity.noContent().build();
  }
}
