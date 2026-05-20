package com.university.lms.course.courses.controller;

import com.university.lms.course.courses.dto.StudentDashboardDto;
import com.university.lms.course.courses.service.CanonicalCourseService;
import com.university.lms.course.web.RequestUserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
public class StudentDashboardController {
  private final CanonicalCourseService courseService;
  private final RequestUserContext userContext;

  @GetMapping("/student")
  public StudentDashboardDto studentDashboard() {
    return courseService.studentDashboard(userContext.requireUserId());
  }
}
