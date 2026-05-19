package com.university.lms.gradebook.web;

import com.university.lms.course.web.RequestUserContext;
import com.university.lms.gradebook.dto.CourseStatsDto;
import com.university.lms.gradebook.dto.StudentProgressDto;
import com.university.lms.gradebook.service.CourseAnalyticsService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class CourseAnalyticsController {

  private final CourseAnalyticsService courseAnalyticsService;
  private final RequestUserContext requestUserContext;

  @GetMapping("/courses/{courseId}/stats")
  @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
  public ResponseEntity<CourseStatsDto> getCourseStats(@PathVariable UUID courseId) {
    return ResponseEntity.ok(
        courseAnalyticsService.getCourseStats(
            courseId, requestUserContext.requireUserId(), requestUserContext.requireUserRole()));
  }

  @GetMapping("/courses/{courseId}/student-progress")
  @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
  public ResponseEntity<List<StudentProgressDto>> getStudentProgress(@PathVariable UUID courseId) {
    return ResponseEntity.ok(
        courseAnalyticsService.getStudentProgress(
            courseId, requestUserContext.requireUserId(), requestUserContext.requireUserRole()));
  }
}
