package com.university.lms.course.courses.controller;

import com.university.lms.course.courses.dto.CourseOverviewDto;
import com.university.lms.course.courses.dto.CourseSummaryDto;
import com.university.lms.course.courses.service.CanonicalCourseService;
import com.university.lms.course.gradebook.dto.StudentGradebookDto;
import com.university.lms.course.gradebook.service.CanonicalGradebookService;
import com.university.lms.course.modules.dto.CourseModulesResponse;
import com.university.lms.course.web.RequestUserContext;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/courses")
@RequiredArgsConstructor
public class CanonicalCourseController {
  private final CanonicalCourseService courseService;
  private final CanonicalGradebookService gradebookService;
  private final RequestUserContext userContext;

  @GetMapping("/my-active")
  public List<CourseSummaryDto> myActiveCourses() {
    return courseService.myActiveCourses(userContext.requireUserId());
  }

  @GetMapping("/{courseId}/overview")
  public CourseOverviewDto overview(@PathVariable UUID courseId) {
    return courseService.overview(courseId, userContext.requireUserId());
  }

  @GetMapping("/{courseId}/modules")
  public CourseModulesResponse modules(@PathVariable UUID courseId) {
    return courseService.modules(courseId, userContext.requireUserId());
  }

  @GetMapping("/{courseId}/gradebook/me")
  public StudentGradebookDto myGradebook(@PathVariable UUID courseId) {
    return gradebookService.studentGradebook(courseId, userContext.requireUserId());
  }
}
