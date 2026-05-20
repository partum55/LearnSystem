package com.university.lms.course.materials.controller;

import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.dto.LearningMaterialRequest;
import com.university.lms.course.materials.dto.LessonDetailDto;
import com.university.lms.course.materials.service.LearningContentService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
public class CanonicalMaterialController {
  private final LearningContentService learningContentService;
  private final RequestUserContext userContext;

  @GetMapping("/materials/{materialId}")
  public LearningItemDto getMaterial(@PathVariable UUID materialId) {
    return learningContentService.getMaterial(materialId, userContext.requireUserId());
  }

  @GetMapping("/lessons/{lessonId}")
  public LessonDetailDto getLesson(@PathVariable UUID lessonId) {
    return learningContentService.getLesson(lessonId, userContext.requireUserId());
  }

  @PostMapping("/courses/{courseId}/modules/{moduleId}/materials")
  @ResponseStatus(HttpStatus.CREATED)
  public LearningItemDto create(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @Valid @RequestBody LearningMaterialRequest request) {
    return learningContentService.createMaterial(courseId, moduleId, userContext.requireUserId(), request);
  }

  @PatchMapping("/materials/{materialId}")
  public LearningItemDto update(
      @PathVariable UUID materialId,
      @Valid @RequestBody LearningMaterialRequest request) {
    return learningContentService.updateMaterial(materialId, userContext.requireUserId(), request);
  }

  @DeleteMapping("/materials/{materialId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID materialId) {
    learningContentService.deleteMaterial(materialId, userContext.requireUserId());
  }
}
