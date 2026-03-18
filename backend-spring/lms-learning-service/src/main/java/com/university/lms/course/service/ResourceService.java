package com.university.lms.course.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.adminops.service.AdminAuditTrailService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.Resource;
import com.university.lms.course.dto.CreateResourceRequest;
import com.university.lms.course.dto.ResourceDto;
import com.university.lms.course.dto.UpdateResourceRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.repository.ResourceRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing course resources. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceService {

  private final ResourceRepository resourceRepository;
  private final ModuleRepository moduleRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final CourseMapper courseMapper;
  private final ModuleUnlockService moduleUnlockService;
  private final AdminAuditTrailService adminAuditTrailService;

  /** Get all resources for a module. */
  @Cacheable(value = "resources", key = "T(String).format('%s:%s', #moduleId, #userId)")
  public List<ResourceDto> getResourcesByModule(UUID moduleId, UUID userId) {
    log.debug("Fetching resources for module: {}", moduleId);

    Module module = findModuleById(moduleId);

    // Check if user can view resources
    boolean canManage = canUserManageCourse(module.getCourse(), userId);
    if (!canManage
        && !courseMemberRepository.existsByCourseIdAndUserId(module.getCourse().getId(), userId)) {
      throw new ValidationException("User does not have access to this course");
    }

    List<Resource> resources = resourceRepository.findByModuleIdOrderByPositionAsc(moduleId);

    // Filter unpublished modules for students
    if (!canManage && !module.getIsPublished()) {
      throw new ValidationException("Module is not published");
    }
    if (!canManage && !moduleUnlockService.isUnlocked(module, userId)) {
      throw new ValidationException("Module is locked until prerequisite module is completed");
    }

    return resources.stream().map(courseMapper::toDto).toList();
  }

  /** Get resource by ID. */
  @Cacheable(value = "resources", key = "T(String).format('%s:%s', #id, #userId)")
  public ResourceDto getResourceById(UUID id, UUID userId) {
    log.debug("Fetching resource by ID: {}", id);

    Resource resource = findResourceById(id);
    Module module = resource.getModule();

    // Check permissions
    boolean canManage = canUserManageCourse(module.getCourse(), userId);
    if (!canManage
        && !courseMemberRepository.existsByCourseIdAndUserId(module.getCourse().getId(), userId)) {
      throw new ValidationException("User does not have access to this course");
    }
    if (!canManage && !module.getIsPublished()) {
      throw new ValidationException("Resource is not available");
    }
    if (!canManage && !moduleUnlockService.isUnlocked(module, userId)) {
      throw new ValidationException("Resource is not available yet");
    }

    return courseMapper.toDto(resource);
  }

  /** Get all resources for a course. */
  public List<ResourceDto> getResourcesByCourse(UUID courseId, UUID userId) {
    log.debug("Fetching all resources for course: {}", courseId);

    if (!courseMemberRepository.existsByCourseIdAndUserId(courseId, userId)
        && !courseMemberRepository.canUserManageCourse(courseId, userId)) {
      throw new ValidationException("User does not have access to this course");
    }
    List<Resource> resources = resourceRepository.findAllByCourseId(courseId);

    return resources.stream().map(courseMapper::toDto).toList();
  }

  /** Create a new resource. */
  @Transactional
  @Caching(evict = {
      @CacheEvict(value = "resources", allEntries = true),
      @CacheEvict(value = "modules", allEntries = true)
  })
  public ResourceDto createResource(UUID moduleId, CreateResourceRequest request, UUID userId) {
    log.info("Creating resource for module: {}", moduleId);

    Module module = findModuleById(moduleId);

    // Check permissions
    if (!canUserManageCourse(module.getCourse(), userId)) {
      throw new ValidationException("User does not have permission to create resources");
    }

    // Get next position
    Integer maxPosition = resourceRepository.findMaxPositionByModule(moduleId);
    Integer nextPosition = (maxPosition != null) ? maxPosition + 1 : 0;

    // Validate resource data
    validateResourceData(
        request.getResourceType(),
        request.getExternalUrl(),
        request.getFileUrl(),
        request.getTextContent());

    Resource resource =
        Resource.builder()
            .module(module)
            .title(request.getTitle())
            .description(request.getDescription())
            .topicId(request.getTopicId())
            .resourceType(request.getResourceType())
            .fileUrl(request.getFileUrl())
            .externalUrl(request.getExternalUrl())
            .fileSize(request.getFileSize())
            .mimeType(request.getMimeType())
            .position(request.getPosition() != null ? request.getPosition() : nextPosition)
            .isDownloadable(
                request.getIsDownloadable() != null ? request.getIsDownloadable() : true)
            .textContent(request.getTextContent())
            .metadata(request.getMetadata())
            .build();

    Resource savedResource = resourceRepository.save(resource);
    log.info("Resource created successfully with ID: {}", savedResource.getId());

    return courseMapper.toDto(savedResource);
  }

  /** Update a resource. */
  @Transactional
  @Caching(evict = {
      @CacheEvict(value = "resources", allEntries = true),
      @CacheEvict(value = "modules", allEntries = true)
  })
  public ResourceDto updateResource(UUID id, UpdateResourceRequest request, UUID userId) {
    log.info("Updating resource: {}", id);

    Resource resource = findResourceById(id);

    // Check permissions
    if (!canUserManageCourse(resource.getModule().getCourse(), userId)) {
      throw new ValidationException("User does not have permission to update this resource");
    }

    String effectiveType = defaultIfBlank(request.getResourceType(), resource.getResourceType());
    String effectiveExternalUrl =
        defaultIfBlank(request.getExternalUrl(), resource.getExternalUrl());
    String effectiveFileUrl = defaultIfBlank(request.getFileUrl(), resource.getFileUrl());
    String effectiveTextContent =
        defaultIfBlank(request.getTextContent(), resource.getTextContent());
    validateResourceData(
        effectiveType, effectiveExternalUrl, effectiveFileUrl, effectiveTextContent);

    // Update fields
    if (request.getTitle() != null) resource.setTitle(request.getTitle());
    if (request.getDescription() != null) resource.setDescription(request.getDescription());
    if (request.getResourceType() != null) resource.setResourceType(request.getResourceType());
    if (request.getFileUrl() != null) resource.setFileUrl(request.getFileUrl());
    if (request.getExternalUrl() != null) resource.setExternalUrl(request.getExternalUrl());
    if (request.getFileSize() != null) resource.setFileSize(request.getFileSize());
    if (request.getMimeType() != null) resource.setMimeType(request.getMimeType());
    if (request.getPosition() != null) resource.setPosition(request.getPosition());
    if (request.getIsDownloadable() != null)
      resource.setIsDownloadable(request.getIsDownloadable());
    if (request.getTextContent() != null) resource.setTextContent(request.getTextContent());
    if (request.getMetadata() != null) resource.setMetadata(request.getMetadata());
    resource.setTopicId(request.getTopicId());

    Resource updatedResource = resourceRepository.save(resource);
    log.info("Resource updated successfully: {}", id);

    return courseMapper.toDto(updatedResource);
  }

  /** Delete a resource. */
  @Transactional
  @Caching(evict = {
      @CacheEvict(value = "resources", allEntries = true),
      @CacheEvict(value = "modules", allEntries = true)
  })
  public void deleteResource(UUID id, UUID userId) {
    log.info("Deleting resource: {}", id);

    Resource resource = findResourceById(id);

    // Check permissions
    if (!canUserManageCourse(resource.getModule().getCourse(), userId)) {
      throw new ValidationException("User does not have permission to delete this resource");
    }

    Map<String, Object> details = new LinkedHashMap<>();
    details.put("resourceId", resource.getId().toString());
    details.put("resourceTitle", resource.getTitle());
    details.put("resourceType", resource.getResourceType());
    details.put("moduleId", resource.getModule().getId().toString());
    details.put("courseId", resource.getModule().getCourse().getId().toString());

    resourceRepository.delete(resource);
    adminAuditTrailService.log(
        userId,
        "RESOURCE_DELETED",
        "RESOURCE",
        resource.getId().toString(),
        details);
    log.info("Resource deleted successfully: {}", id);
  }

  /** Reorder resources within a module. */
  @Transactional
  @Caching(evict = {
      @CacheEvict(value = "resources", allEntries = true),
      @CacheEvict(value = "modules", allEntries = true)
  })
  public void reorderResources(UUID moduleId, List<UUID> resourceIds, UUID userId) {
    log.info("Reordering resources for module: {}", moduleId);

    Module module = findModuleById(moduleId);

    // Check permissions
    if (!canUserManageCourse(module.getCourse(), userId)) {
      throw new ValidationException("User does not have permission to reorder resources");
    }

    // Update positions
    for (int i = 0; i < resourceIds.size(); i++) {
      Resource resource = findResourceById(resourceIds.get(i));
      if (!resource.getModule().getId().equals(moduleId)) {
        throw new ValidationException("Resource does not belong to this module");
      }
      resource.setPosition(i);
      resourceRepository.save(resource);
    }

    log.info("Resources reordered successfully for module: {}", moduleId);
  }

  // Helper methods

  private Module findModuleById(UUID id) {
    return moduleRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Module", "id", id));
  }

  private Resource findResourceById(UUID id) {
    return resourceRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", id));
  }

  private boolean canUserManageCourse(Course course, UUID userId) {
    if (course.getOwnerId().equals(userId)) {
      return true;
    }
    return courseMemberRepository.canUserManageCourse(course.getId(), userId);
  }

  private void validateResourceData(
      String type, String externalUrl, String fileUrl, String textContent) {
    String normalizedType = type == null ? "" : type.trim().toUpperCase();

    if ("LINK".equals(normalizedType) && isBlank(externalUrl)) {
      throw new ValidationException("External URL is required for LINK resources");
    }

    if (("VIDEO".equals(normalizedType)
            || "PDF".equals(normalizedType)
            || "SLIDE".equals(normalizedType)
            || "CODE".equals(normalizedType))
        && isBlank(fileUrl)) {
      throw new ValidationException("File URL is required for " + normalizedType + " resources");
    }

    if ("TEXT".equals(normalizedType) && isBlank(textContent)) {
      throw new ValidationException("Text content is required for TEXT resources");
    }
  }

  private String defaultIfBlank(String value, String defaultValue) {
    return isBlank(value) ? defaultValue : value;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
