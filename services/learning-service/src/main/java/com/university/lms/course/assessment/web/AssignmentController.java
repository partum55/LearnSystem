package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.AssignmentDto;
import com.university.lms.course.assessment.dto.CreateAssignmentRequest;
import com.university.lms.course.assessment.dto.DuplicateAssignmentRequest;
import com.university.lms.course.assessment.dto.UpdateAssignmentRequest;
import com.university.lms.course.assessment.service.AssignmentService;
import com.university.lms.course.web.RequestUserContext;
import com.university.lms.common.dto.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for assignment management.
 */
@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final RequestUserContext requestUserContext;

    /**
     * Get assignment by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AssignmentDto> getAssignment(@PathVariable UUID id) {
        AssignmentDto assignment = assignmentService.getAssignmentById(id);
        return ResponseEntity.ok(assignment);
    }

    /**
     * Get assignments by course.
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<PageResponse<AssignmentDto>> getAssignmentsByCourse(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "dueDate") String sortBy) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, sortBy));
        PageResponse<AssignmentDto> assignments = assignmentService.getAssignmentsByCourse(courseId, pageable);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get published assignments.
     */
    @GetMapping("/course/{courseId}/published")
    public ResponseEntity<List<AssignmentDto>> getPublishedAssignments(@PathVariable UUID courseId) {
        List<AssignmentDto> assignments = assignmentService.getPublishedAssignments(courseId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get available assignments.
     */
    @GetMapping("/course/{courseId}/available")
    public ResponseEntity<List<AssignmentDto>> getAvailableAssignments(@PathVariable UUID courseId) {
        List<AssignmentDto> assignments = assignmentService.getAvailableAssignments(courseId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get upcoming assignments.
     */
    @GetMapping("/course/{courseId}/upcoming")
    public ResponseEntity<List<AssignmentDto>> getUpcomingAssignments(@PathVariable UUID courseId) {
        List<AssignmentDto> assignments = assignmentService.getUpcomingAssignments(courseId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get overdue assignments.
     */
    @GetMapping("/course/{courseId}/overdue")
    public ResponseEntity<List<AssignmentDto>> getOverdueAssignments(@PathVariable UUID courseId) {
        List<AssignmentDto> assignments = assignmentService.getOverdueAssignments(courseId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get assignments by module.
     */
    @GetMapping("/module/{moduleId}")
    public ResponseEntity<List<AssignmentDto>> getAssignmentsByModule(@PathVariable UUID moduleId) {
        List<AssignmentDto> assignments = assignmentService.getAssignmentsByModule(moduleId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get assignments by type.
     */
    @GetMapping("/course/{courseId}/type/{type}")
    public ResponseEntity<PageResponse<AssignmentDto>> getAssignmentsByType(
            @PathVariable UUID courseId,
            @PathVariable String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageResponse<AssignmentDto> assignments = assignmentService.getAssignmentsByType(courseId, type, pageable);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Search assignments.
     */
    @GetMapping("/course/{courseId}/search")
    public ResponseEntity<PageResponse<AssignmentDto>> searchAssignments(
            @PathVariable UUID courseId,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageResponse<AssignmentDto> assignments = assignmentService.searchAssignments(courseId, q, pageable);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Create assignment.
     */
    @PostMapping
    public ResponseEntity<AssignmentDto> createAssignment(
            @Valid @RequestBody CreateAssignmentRequest createRequest) {

        UUID createdBy = requestUserContext.requireUserId();
        AssignmentDto assignment = assignmentService.createAssignment(createRequest, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(assignment);
    }

    /**
     * Update assignment.
     */
    @PutMapping("/{id}")
    public ResponseEntity<AssignmentDto> updateAssignment(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAssignmentRequest updateRequest) {

        UUID userId = requestUserContext.requireUserId();
        AssignmentDto assignment = assignmentService.updateAssignment(id, updateRequest, userId);
        return ResponseEntity.ok(assignment);
    }

    /**
     * Delete assignment.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssignment(@PathVariable UUID id) {
        UUID userId = requestUserContext.requireUserId();
        assignmentService.deleteAssignment(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Publish assignment.
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<AssignmentDto> publishAssignment(@PathVariable UUID id) {
        UUID userId = requestUserContext.requireUserId();
        AssignmentDto assignment = assignmentService.publishAssignment(id, userId);
        return ResponseEntity.ok(assignment);
    }

    /**
     * Unpublish assignment.
     */
    @PostMapping("/{id}/unpublish")
    public ResponseEntity<AssignmentDto> unpublishAssignment(@PathVariable UUID id) {
        UUID userId = requestUserContext.requireUserId();
        AssignmentDto assignment = assignmentService.unpublishAssignment(id, userId);
        return ResponseEntity.ok(assignment);
    }

    /**
     * Archive assignment.
     */
    @PostMapping("/{id}/archive")
    public ResponseEntity<AssignmentDto> archiveAssignment(@PathVariable UUID id) {
        UUID userId = requestUserContext.requireUserId();
        AssignmentDto assignment = assignmentService.archiveAssignment(id, userId);
        return ResponseEntity.ok(assignment);
    }

    /**
     * Duplicate assignment.
     */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<AssignmentDto> duplicateAssignment(
            @PathVariable UUID id,
            @RequestBody(required = false) DuplicateAssignmentRequest request,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID moduleId) {
        UUID userId = requestUserContext.requireUserId();
        String userRole = requestUserContext.requireUserRole();

        UUID targetCourseId = request != null && request.getTargetCourseId() != null
                ? request.getTargetCourseId()
                : courseId;
        UUID targetModuleId = request != null && request.getTargetModuleId() != null
                ? request.getTargetModuleId()
                : moduleId;

        AssignmentDto assignment =
                assignmentService.duplicateAssignment(id, userId, userRole, targetCourseId, targetModuleId);
        return ResponseEntity.status(HttpStatus.CREATED).body(assignment);
    }

    /**
     * Get point budget summary for all published assignments in a course.
     */
    @GetMapping("/course/{courseId}/point-budget")
    public ResponseEntity<Map<String, Object>> getPointBudget(@PathVariable UUID courseId) {
        Map<String, Object> budget = assignmentService.getPointBudget(courseId);
        return ResponseEntity.ok(budget);
    }

    @GetMapping
    public ResponseEntity<List<AssignmentDto>> getAssessmentsByCourseId(@RequestParam("courseId") UUID courseId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsByCourse(courseId));
    }
}
