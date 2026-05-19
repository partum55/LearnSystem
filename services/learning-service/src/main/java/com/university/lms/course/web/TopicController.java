package com.university.lms.course.web;

import com.university.lms.course.dto.CreateTopicRequest;
import com.university.lms.course.dto.TopicDto;
import com.university.lms.course.dto.UpdateTopicRequest;
import com.university.lms.course.service.TopicService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** REST Controller for topic management within modules. */
@RestController
@RequestMapping("/courses/{courseId}/modules/{moduleId}/topics")
@RequiredArgsConstructor
@Slf4j
public class TopicController {

  private final TopicService topicService;
  private final RequestUserContext requestUserContext;

  /** Get all topics for a module. */
  @GetMapping
  public ResponseEntity<List<TopicDto>> getTopics(
      @PathVariable UUID courseId, @PathVariable UUID moduleId) {

    UUID userId = requestUserContext.requireUserId();
    List<TopicDto> topics = topicService.getTopicsByModule(courseId, moduleId, userId);
    return ResponseEntity.ok(topics);
  }

  /** Get topic by ID. */
  @GetMapping("/{topicId}")
  public ResponseEntity<TopicDto> getTopic(
      @PathVariable UUID courseId, @PathVariable UUID moduleId, @PathVariable UUID topicId) {

    UUID userId = requestUserContext.requireUserId();
    TopicDto topic = topicService.getTopicById(courseId, moduleId, topicId, userId);
    return ResponseEntity.ok(topic);
  }

  /** Create a new topic. */
  @PostMapping
  public ResponseEntity<TopicDto> createTopic(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @Valid @RequestBody CreateTopicRequest request) {

    UUID userId = requestUserContext.requireUserId();
    TopicDto topic = topicService.createTopic(courseId, moduleId, request, userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(topic);
  }

  /** Update a topic. */
  @PutMapping("/{topicId}")
  public ResponseEntity<TopicDto> updateTopic(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @PathVariable UUID topicId,
      @Valid @RequestBody UpdateTopicRequest request) {

    UUID userId = requestUserContext.requireUserId();
    TopicDto topic = topicService.updateTopic(courseId, moduleId, topicId, request, userId);
    return ResponseEntity.ok(topic);
  }

  /** Delete a topic. */
  @DeleteMapping("/{topicId}")
  public ResponseEntity<Void> deleteTopic(
      @PathVariable UUID courseId, @PathVariable UUID moduleId, @PathVariable UUID topicId) {

    UUID userId = requestUserContext.requireUserId();
    topicService.deleteTopic(courseId, moduleId, topicId, userId);
    return ResponseEntity.noContent().build();
  }

  /** Reorder topics within a module. */
  @PutMapping("/reorder")
  public ResponseEntity<Void> reorderTopics(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @RequestBody List<UUID> topicIds) {

    UUID userId = requestUserContext.requireUserId();
    topicService.reorderTopics(courseId, moduleId, topicIds, userId);
    return ResponseEntity.ok().build();
  }
}
