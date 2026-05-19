package com.university.lms.course.web;

import com.university.lms.course.dto.CreateResourceRequest;
import com.university.lms.course.dto.ResourceDto;
import com.university.lms.course.dto.UpdateResourceRequest;
import com.university.lms.course.service.ResourceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for resource management. Note: Context path is /api, so paths here are relative
 * to /api
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class ResourceController {

  private final ResourceService resourceService;
  private final RequestUserContext requestUserContext;

  /** Get all resources for a course. */
  @GetMapping("/courses/{courseId}/resources")
  public ResponseEntity<List<ResourceDto>> getAllCourseResources(@PathVariable UUID courseId) {

    UUID userId = requestUserContext.requireUserId();
    List<ResourceDto> resources = resourceService.getResourcesByCourse(courseId, userId);
    return ResponseEntity.ok(resources);
  }

  /** Get all resources for a module. */
  @GetMapping("/courses/{courseId}/modules/{moduleId}/resources")
  public ResponseEntity<List<ResourceDto>> getResources(
      @PathVariable UUID courseId, @PathVariable UUID moduleId) {

    UUID userId = requestUserContext.requireUserId();
    List<ResourceDto> resources = resourceService.getResourcesByModule(moduleId, userId);
    return ResponseEntity.ok(resources);
  }

  /** Get resource by ID. */
  @GetMapping("/courses/{courseId}/modules/{moduleId}/resources/{resourceId}")
  public ResponseEntity<ResourceDto> getResource(
      @PathVariable UUID courseId, @PathVariable UUID moduleId, @PathVariable UUID resourceId) {

    UUID userId = requestUserContext.requireUserId();
    ResourceDto resource = resourceService.getResourceById(resourceId, userId);
    return ResponseEntity.ok(resource);
  }

  /** Create a new resource. */
  @PostMapping("/courses/{courseId}/modules/{moduleId}/resources")
  public ResponseEntity<ResourceDto> createResource(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @Valid @RequestBody CreateResourceRequest request) {

    UUID userId = requestUserContext.requireUserId();
    ResourceDto resource = resourceService.createResource(moduleId, request, userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(resource);
  }

  /** Update a resource. */
  @PutMapping("/courses/{courseId}/modules/{moduleId}/resources/{resourceId}")
  public ResponseEntity<ResourceDto> updateResource(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @PathVariable UUID resourceId,
      @Valid @RequestBody UpdateResourceRequest request) {

    UUID userId = requestUserContext.requireUserId();
    ResourceDto resource = resourceService.updateResource(resourceId, request, userId);
    return ResponseEntity.ok(resource);
  }

  /** Delete a resource. */
  @DeleteMapping("/courses/{courseId}/modules/{moduleId}/resources/{resourceId}")
  public ResponseEntity<Void> deleteResource(
      @PathVariable UUID courseId, @PathVariable UUID moduleId, @PathVariable UUID resourceId) {

    UUID userId = requestUserContext.requireUserId();
    resourceService.deleteResource(resourceId, userId);
    return ResponseEntity.noContent().build();
  }

  /** Reorder resources within a module. */
  @PutMapping("/courses/{courseId}/modules/{moduleId}/resources/reorder")
  public ResponseEntity<Void> reorderResources(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @RequestBody List<UUID> resourceIds) {

    UUID userId = requestUserContext.requireUserId();
    resourceService.reorderResources(moduleId, resourceIds, userId);
    return ResponseEntity.ok().build();
  }
}
