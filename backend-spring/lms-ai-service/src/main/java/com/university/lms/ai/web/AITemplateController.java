package com.university.lms.ai.web;

import com.university.lms.ai.domain.CourseTemplate;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.service.TemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for AI course templates
 */
@RestController
@RequestMapping("/api/ai/templates")
@RequiredArgsConstructor
@Slf4j
public class AITemplateController {

    private final TemplateService templateService;

    /**
     * Get all public templates
     * GET /api/ai/templates
     */
    @GetMapping
    public ResponseEntity<List<CourseTemplate>> getAllTemplates() {
        log.info("Fetching all public templates");
        return ResponseEntity.ok(templateService.getAllPublicTemplates());
    }

    /**
     * Get templates by category
     * GET /api/ai/templates?category=programming
     */
    @GetMapping(params = "category")
    public ResponseEntity<List<CourseTemplate>> getTemplatesByCategory(
            @RequestParam String category) {
        log.info("Fetching templates for category: {}", category);
        return ResponseEntity.ok(templateService.getTemplatesByCategory(category));
    }

    /**
     * Get popular templates
     * GET /api/ai/templates/popular
     */
    @GetMapping("/popular")
    public ResponseEntity<List<CourseTemplate>> getPopularTemplates() {
        log.info("Fetching popular templates");
        return ResponseEntity.ok(templateService.getPopularTemplates());
    }

    /**
     * Get template by ID
     * GET /api/ai/templates/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<CourseTemplate> getTemplate(@PathVariable UUID id) {
        log.info("Fetching template: {}", id);
        return ResponseEntity.ok(templateService.getTemplateById(id));
    }

    /**
     * Create new template
     * POST /api/ai/templates
     */
    @PostMapping
    public ResponseEntity<CourseTemplate> createTemplate(
            @Valid @RequestBody CourseTemplate template) {
        log.info("Creating new template: {}", template.getName());
        CourseTemplate created = templateService.createTemplate(template);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update template
     * PUT /api/ai/templates/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<CourseTemplate> updateTemplate(
            @PathVariable UUID id,
            @Valid @RequestBody CourseTemplate template) {
        log.info("Updating template: {}", id);
        return ResponseEntity.ok(templateService.updateTemplate(id, template));
    }

    /**
     * Delete template (soft delete)
     * DELETE /api/ai/templates/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        log.info("Deleting template: {}", id);
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Generate course from template
     * POST /api/ai/templates/{id}/generate
     */
    @PostMapping("/{id}/generate")
    public ResponseEntity<GeneratedCourseResponse> generateFromTemplate(
            @PathVariable UUID id,
            @RequestBody Map<String, String> variables) {
        log.info("Generating course from template: {} with variables: {}", id, variables);
        GeneratedCourseResponse response = templateService.generateFromTemplate(id, variables);
        return ResponseEntity.ok(response);
    }

    /**
     * Initialize default templates
     * POST /api/ai/templates/initialize
     */
    @PostMapping("/initialize")
    public ResponseEntity<Map<String, String>> initializeTemplates() {
        log.info("Initializing default templates");
        templateService.initializeDefaultTemplates();
        return ResponseEntity.ok(Map.of(
            "message", "Default templates initialized successfully"
        ));
    }
}

