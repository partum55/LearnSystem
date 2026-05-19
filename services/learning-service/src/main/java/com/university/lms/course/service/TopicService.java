package com.university.lms.course.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.Topic;
import com.university.lms.course.dto.CreateTopicRequest;
import com.university.lms.course.dto.TopicDto;
import com.university.lms.course.dto.UpdateTopicRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.repository.TopicRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing topics within modules. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TopicService {

  private final TopicRepository topicRepository;
  private final ModuleRepository moduleRepository;
  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;

  /** Get all topics for a module. */
  public List<TopicDto> getTopicsByModule(UUID courseId, UUID moduleId, UUID userId) {
    log.debug("Fetching topics for module: {}", moduleId);

    Module module = findModuleAndValidateCourse(courseId, moduleId);
    validateAccess(module.getCourse(), userId);

    return topicRepository.findByModuleIdOrderByPositionAsc(moduleId).stream()
        .map(this::toDto)
        .toList();
  }

  /** Get topic by ID. */
  public TopicDto getTopicById(UUID courseId, UUID moduleId, UUID topicId, UUID userId) {
    log.debug("Fetching topic by ID: {}", topicId);

    Module module = findModuleAndValidateCourse(courseId, moduleId);
    validateAccess(module.getCourse(), userId);

    Topic topic = findTopicById(topicId);
    if (!topic.getModule().getId().equals(moduleId)) {
      throw new ValidationException("Topic does not belong to this module");
    }

    return toDto(topic);
  }

  /** Create a new topic. */
  @Transactional
  public TopicDto createTopic(
      UUID courseId, UUID moduleId, CreateTopicRequest request, UUID userId) {
    log.info("Creating topic for module: {}", moduleId);

    Module module = findModuleAndValidateCourse(courseId, moduleId);
    validateManagePermission(module.getCourse(), userId);

    Integer maxPosition = topicRepository.findMaxPositionByModule(moduleId);
    int nextPosition = maxPosition + 1;

    Topic topic =
        Topic.builder()
            .module(module)
            .title(request.getTitle())
            .description(request.getDescription())
            .position(request.getPosition() != null ? request.getPosition() : nextPosition)
            .build();

    Topic saved = topicRepository.save(topic);
    log.info("Topic created successfully with ID: {}", saved.getId());
    return toDto(saved);
  }

  /** Update a topic. */
  @Transactional
  public TopicDto updateTopic(
      UUID courseId, UUID moduleId, UUID topicId, UpdateTopicRequest request, UUID userId) {
    log.info("Updating topic: {}", topicId);

    Module module = findModuleAndValidateCourse(courseId, moduleId);
    validateManagePermission(module.getCourse(), userId);

    Topic topic = findTopicById(topicId);
    if (!topic.getModule().getId().equals(moduleId)) {
      throw new ValidationException("Topic does not belong to this module");
    }

    if (request.getTitle() != null) topic.setTitle(request.getTitle());
    if (request.getDescription() != null) topic.setDescription(request.getDescription());
    if (request.getPosition() != null) topic.setPosition(request.getPosition());

    Topic updated = topicRepository.save(topic);
    log.info("Topic updated successfully: {}", topicId);
    return toDto(updated);
  }

  /** Delete a topic. */
  @Transactional
  public void deleteTopic(UUID courseId, UUID moduleId, UUID topicId, UUID userId) {
    log.info("Deleting topic: {}", topicId);

    Module module = findModuleAndValidateCourse(courseId, moduleId);
    validateManagePermission(module.getCourse(), userId);

    Topic topic = findTopicById(topicId);
    if (!topic.getModule().getId().equals(moduleId)) {
      throw new ValidationException("Topic does not belong to this module");
    }

    topicRepository.delete(topic);
    log.info("Topic deleted successfully: {}", topicId);
  }

  /** Reorder topics within a module. */
  @Transactional
  public void reorderTopics(UUID courseId, UUID moduleId, List<UUID> topicIds, UUID userId) {
    log.info("Reordering topics for module: {}", moduleId);

    Module module = findModuleAndValidateCourse(courseId, moduleId);
    validateManagePermission(module.getCourse(), userId);

    for (int i = 0; i < topicIds.size(); i++) {
      Topic topic = findTopicById(topicIds.get(i));
      if (!topic.getModule().getId().equals(moduleId)) {
        throw new ValidationException("Topic does not belong to this module");
      }
      topic.setPosition(i);
      topicRepository.save(topic);
    }

    log.info("Topics reordered successfully for module: {}", moduleId);
  }

  // Helper methods

  private Module findModuleAndValidateCourse(UUID courseId, UUID moduleId) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
    Module module =
        moduleRepository
            .findById(moduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Module", "id", moduleId));
    if (!module.getCourse().getId().equals(courseId)) {
      throw new ValidationException("Module does not belong to this course");
    }
    return module;
  }

  private Topic findTopicById(UUID id) {
    return topicRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", id));
  }

  private void validateAccess(Course course, UUID userId) {
    if (canUserManageCourse(course, userId)) return;
    if (!courseMemberRepository.existsByCourseIdAndUserId(course.getId(), userId)) {
      throw new ValidationException("User does not have access to this course");
    }
  }

  private void validateManagePermission(Course course, UUID userId) {
    if (!canUserManageCourse(course, userId)) {
      throw new ValidationException("User does not have permission to manage topics");
    }
  }

  private boolean canUserManageCourse(Course course, UUID userId) {
    if (course.getOwnerId().equals(userId)) return true;
    return courseMemberRepository.canUserManageCourse(course.getId(), userId);
  }

  private TopicDto toDto(Topic topic) {
    return TopicDto.builder()
        .id(topic.getId())
        .moduleId(topic.getModule().getId())
        .title(topic.getTitle())
        .description(topic.getDescription())
        .position(topic.getPosition())
        .createdAt(topic.getCreatedAt())
        .updatedAt(topic.getUpdatedAt())
        .build();
  }
}
