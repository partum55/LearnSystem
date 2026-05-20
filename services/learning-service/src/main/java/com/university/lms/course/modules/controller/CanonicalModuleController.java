package com.university.lms.course.modules.controller;

import com.university.lms.course.courses.service.CanonicalCourseService;
import com.university.lms.course.modules.dto.CourseModuleDto;
import com.university.lms.course.modules.dto.ModuleRequest;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CanonicalModuleController {
  private final CanonicalCourseService courseService;
  private final RequestUserContext userContext;

  @PostMapping("/courses/{courseId}/modules")
  @ResponseStatus(HttpStatus.CREATED)
  public CourseModuleDto create(@PathVariable UUID courseId, @Valid @RequestBody ModuleRequest request) {
    return courseService.createModule(courseId, userContext.requireUserId(), request);
  }

  @PatchMapping("/modules/{moduleId}")
  public CourseModuleDto update(@PathVariable UUID moduleId, @Valid @RequestBody ModuleRequest request) {
    return courseService.updateModule(moduleId, userContext.requireUserId(), request);
  }

  @DeleteMapping("/modules/{moduleId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID moduleId) {
    courseService.deleteModule(moduleId, userContext.requireUserId());
  }
}
