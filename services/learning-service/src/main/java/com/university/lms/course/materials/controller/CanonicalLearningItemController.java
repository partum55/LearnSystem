package com.university.lms.course.materials.controller;

import com.university.lms.course.materials.dto.LearningItemDto;
import com.university.lms.course.materials.dto.LearningItemRequest;
import com.university.lms.course.materials.dto.LessonBlockDto;
import com.university.lms.course.materials.dto.LessonBlockReorderRequest;
import com.university.lms.course.materials.dto.LessonBlockRequest;
import com.university.lms.course.materials.dto.LessonDetailDto;
import com.university.lms.course.materials.service.LearningContentService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.List;
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
public class CanonicalLearningItemController {
  private final LearningContentService learningContentService;
  private final RequestUserContext userContext;

  @PostMapping("/courses/{courseId}/modules/{moduleId}/learning-items")
  @ResponseStatus(HttpStatus.CREATED)
  public LearningItemDto createLearningItem(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @Valid @RequestBody LearningItemRequest request) {
    return learningContentService.createLearningItem(
        courseId, moduleId, userContext.requireUserId(), request);
  }

  @GetMapping("/learning-items/{learningItemId}")
  public LearningItemDto getLearningItem(@PathVariable UUID learningItemId) {
    return learningContentService.getLearningItem(learningItemId, userContext.requireUserId());
  }

  @PatchMapping("/learning-items/{learningItemId}")
  public LearningItemDto updateLearningItem(
      @PathVariable UUID learningItemId,
      @Valid @RequestBody LearningItemRequest request) {
    return learningContentService.updateLearningItem(
        learningItemId, userContext.requireUserId(), request);
  }

  @DeleteMapping("/learning-items/{learningItemId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archiveLearningItem(@PathVariable UUID learningItemId) {
    learningContentService.archiveLearningItem(learningItemId, userContext.requireUserId());
  }

  @GetMapping("/learning-items/{learningItemId}/blocks")
  public List<LessonBlockDto> listBlocks(@PathVariable UUID learningItemId) {
    return learningContentService.listLessonBlocks(learningItemId, userContext.requireUserId());
  }

  @PostMapping("/learning-items/{learningItemId}/blocks")
  @ResponseStatus(HttpStatus.CREATED)
  public LessonBlockDto createBlock(
      @PathVariable UUID learningItemId,
      @Valid @RequestBody LessonBlockRequest request) {
    return learningContentService.createLessonBlock(
        learningItemId, userContext.requireUserId(), request);
  }

  @PatchMapping("/learning-items/{learningItemId}/blocks/{blockId}")
  public LessonBlockDto updateBlock(
      @PathVariable UUID learningItemId,
      @PathVariable UUID blockId,
      @Valid @RequestBody LessonBlockRequest request) {
    return learningContentService.updateLessonBlock(
        learningItemId, blockId, userContext.requireUserId(), request);
  }

  @DeleteMapping("/learning-items/{learningItemId}/blocks/{blockId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteBlock(@PathVariable UUID learningItemId, @PathVariable UUID blockId) {
    learningContentService.deleteLessonBlock(learningItemId, blockId, userContext.requireUserId());
  }

  @PatchMapping("/learning-items/{learningItemId}/blocks/reorder")
  public LessonDetailDto reorderBlocks(
      @PathVariable UUID learningItemId,
      @Valid @RequestBody LessonBlockReorderRequest request) {
    return learningContentService.reorderLessonBlocks(
        learningItemId, userContext.requireUserId(), request);
  }
}
