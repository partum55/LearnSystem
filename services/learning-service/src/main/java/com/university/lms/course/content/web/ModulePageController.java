package com.university.lms.course.content.web;

import com.university.lms.course.content.dto.CreateModulePageRequest;
import com.university.lms.course.content.dto.ModulePageDto;
import com.university.lms.course.content.dto.UpdateModulePageRequest;
import com.university.lms.course.content.service.ModulePageService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** REST endpoints for module page tree management. */
@RestController
@RequestMapping("/courses/{courseId}/modules/{moduleId}/pages")
@RequiredArgsConstructor
public class ModulePageController {

  private final ModulePageService modulePageService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  public ResponseEntity<List<ModulePageDto>> getPages(
      @PathVariable UUID courseId, @PathVariable UUID moduleId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(modulePageService.getModulePages(courseId, moduleId, userId, userRole));
  }

  @GetMapping("/{pageId}")
  public ResponseEntity<ModulePageDto> getPage(
      @PathVariable UUID courseId, @PathVariable UUID moduleId, @PathVariable UUID pageId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        modulePageService.getModulePage(courseId, moduleId, pageId, userId, userRole));
  }

  @PostMapping
  public ResponseEntity<ModulePageDto> createPage(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @Valid @RequestBody CreateModulePageRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    ModulePageDto page =
        modulePageService.createModulePage(courseId, moduleId, request, userId, userRole);
    return ResponseEntity.status(HttpStatus.CREATED).body(page);
  }

  @PutMapping("/{pageId}")
  public ResponseEntity<ModulePageDto> updatePage(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @PathVariable UUID pageId,
      @Valid @RequestBody UpdateModulePageRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        modulePageService.updateModulePage(courseId, moduleId, pageId, request, userId, userRole));
  }

  @DeleteMapping("/{pageId}")
  public ResponseEntity<Void> deletePage(
      @PathVariable UUID courseId, @PathVariable UUID moduleId, @PathVariable UUID pageId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    modulePageService.deleteModulePage(courseId, moduleId, pageId, userId, userRole);
    return ResponseEntity.noContent().build();
  }
}
