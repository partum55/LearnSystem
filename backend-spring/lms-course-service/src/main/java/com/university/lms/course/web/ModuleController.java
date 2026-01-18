package com.university.lms.course.web;

import com.university.lms.course.dto.CreateModuleRequest;
import com.university.lms.course.dto.ModuleDto;
import com.university.lms.course.dto.UpdateModuleRequest;
import com.university.lms.course.service.ModuleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for module management.
 */
@RestController
@RequestMapping("/courses/{courseId}/modules")
@RequiredArgsConstructor
@Slf4j
public class ModuleController {

    private final ModuleService moduleService;
    private final HttpServletRequest request;

    /**
     * Get all modules for a course.
     */
    @GetMapping
    public ResponseEntity<List<ModuleDto>> getModules(
            @PathVariable UUID courseId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        List<ModuleDto> modules = moduleService.getModulesByCourse(courseId, userId);
        return ResponseEntity.ok(modules);
    }

    /**
     * Get module by ID.
     */
    @GetMapping("/{moduleId}")
    public ResponseEntity<ModuleDto> getModule(
            @PathVariable UUID courseId,
            @PathVariable UUID moduleId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        ModuleDto module = moduleService.getModuleById(moduleId, userId);
        return ResponseEntity.ok(module);
    }

    /**
     * Create a new module.
     */
    @PostMapping
    public ResponseEntity<ModuleDto> createModule(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateModuleRequest request,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        ModuleDto module = moduleService.createModule(courseId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(module);
    }

    /**
     * Update a module.
     */
    @PutMapping("/{moduleId}")
    public ResponseEntity<ModuleDto> updateModule(
            @PathVariable UUID courseId,
            @PathVariable UUID moduleId,
            @Valid @RequestBody UpdateModuleRequest request,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        ModuleDto module = moduleService.updateModule(moduleId, request, userId);
        return ResponseEntity.ok(module);
    }

    /**
     * Delete a module.
     */
    @DeleteMapping("/{moduleId}")
    public ResponseEntity<Void> deleteModule(
            @PathVariable UUID courseId,
            @PathVariable UUID moduleId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        moduleService.deleteModule(moduleId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reorder modules.
     */
    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderModules(
            @PathVariable UUID courseId,
            @RequestBody List<UUID> moduleIds,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        moduleService.reorderModules(courseId, moduleIds, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Publish a module.
     */
    @PostMapping("/{moduleId}/publish")
    public ResponseEntity<ModuleDto> publishModule(
            @PathVariable UUID courseId,
            @PathVariable UUID moduleId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        ModuleDto module = moduleService.publishModule(moduleId, userId);
        return ResponseEntity.ok(module);
    }

    /**
     * Unpublish a module.
     */
    @PostMapping("/{moduleId}/unpublish")
    public ResponseEntity<ModuleDto> unpublishModule(
            @PathVariable UUID courseId,
            @PathVariable UUID moduleId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        ModuleDto module = moduleService.unpublishModule(moduleId, userId);
        return ResponseEntity.ok(module);
    }

    // Helper method
    private UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() != null) {
            Object userId = request.getAttribute("userId");
            if (userId instanceof UUID) {
                return (UUID) userId;
            }
        }
        throw new RuntimeException("User not authenticated");
    }
}

