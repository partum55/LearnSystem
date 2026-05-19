package com.university.lms.gradebook.web;

import com.university.lms.gradebook.dto.CreateCategoryRequest;
import com.university.lms.gradebook.dto.GradebookCategoryDto;
import com.university.lms.gradebook.service.GradebookCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for gradebook categories.
 */
@RestController
@RequestMapping("/gradebook/categories")
@RequiredArgsConstructor
@Slf4j
public class GradebookCategoryController {

    private final GradebookCategoryService categoryService;

    @GetMapping("/course/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<GradebookCategoryDto>> getCourseCategories(
            @PathVariable UUID courseId,
            @RequestAttribute("userId") UUID userId) {
        log.info("Fetching categories for course: {}", courseId);
        List<GradebookCategoryDto> categories = categoryService.getCategoriesForCourse(courseId, userId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{categoryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GradebookCategoryDto> getCategory(
            @PathVariable UUID categoryId,
            @RequestAttribute("userId") UUID userId) {
        log.info("Fetching category: {}", categoryId);
        GradebookCategoryDto category = categoryService.getCategoryById(categoryId, userId);
        return ResponseEntity.ok(category);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<GradebookCategoryDto> createCategory(
            @Valid @RequestBody CreateCategoryRequest request,
            @RequestAttribute("userId") UUID userId) {
        log.info("Creating category for course: {}", request.getCourseId());
        GradebookCategoryDto created = categoryService.createCategory(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{categoryId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<GradebookCategoryDto> updateCategory(
            @PathVariable UUID categoryId,
            @Valid @RequestBody CreateCategoryRequest request,
            @RequestAttribute("userId") UUID userId) {
        log.info("Updating category: {}", categoryId);
        GradebookCategoryDto updated = categoryService.updateCategory(categoryId, request, userId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{categoryId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable UUID categoryId,
            @RequestAttribute("userId") UUID userId) {
        log.info("Deleting category: {}", categoryId);
        categoryService.deleteCategory(categoryId, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/course/{courseId}/reorder")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<Void> reorderCategories(
            @PathVariable UUID courseId,
            @RequestBody List<UUID> categoryIds,
            @RequestAttribute("userId") UUID userId) {
        log.info("Reordering categories for course: {}", courseId);
        categoryService.reorderCategories(courseId, categoryIds, userId);
        return ResponseEntity.ok().build();
    }
}
