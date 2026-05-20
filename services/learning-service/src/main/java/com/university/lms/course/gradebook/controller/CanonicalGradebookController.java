package com.university.lms.course.gradebook.controller;

import com.university.lms.course.gradebook.dto.GradebookCellUpdateRequest;
import com.university.lms.course.gradebook.dto.GradebookPublishRequest;
import com.university.lms.course.gradebook.dto.TeacherGradebookDto;
import com.university.lms.course.gradebook.service.CanonicalGradebookService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/courses/{courseId}/gradebook")
@RequiredArgsConstructor
public class CanonicalGradebookController {
  private final CanonicalGradebookService gradebookService;
  private final RequestUserContext userContext;

  @GetMapping
  public TeacherGradebookDto teacherGradebook(@PathVariable UUID courseId) {
    return gradebookService.teacherGradebook(courseId, userContext.requireUserId());
  }

  @PatchMapping("/cells")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void updateCells(
      @PathVariable UUID courseId,
      @Valid @RequestBody GradebookCellUpdateRequest request) {
    gradebookService.updateCells(courseId, userContext.requireUserId(), request);
  }

  @PostMapping("/publish")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void publish(
      @PathVariable UUID courseId,
      @Valid @RequestBody GradebookPublishRequest request) {
    gradebookService.publish(courseId, userContext.requireUserId(), request);
  }
}
