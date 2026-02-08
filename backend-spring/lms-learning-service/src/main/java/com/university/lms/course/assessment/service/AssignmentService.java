package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.dto.AssignmentDto;
import com.university.lms.course.assessment.dto.CreateAssignmentRequest;
import com.university.lms.course.assessment.dto.UpdateAssignmentRequest;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing assignments.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssessmentMapper mapper;

    /**
     * Get assignment by ID.
     */
    @Cacheable(value = "assignments", key = "#id")
    public AssignmentDto getAssignmentById(UUID id) {
        log.debug("Fetching assignment by ID: {}", id);
        Assignment assignment = findAssignmentById(id);
        return mapper.toDto(assignment);
    }

    /**
     * Get all assignments for a course.
     */
    public PageResponse<AssignmentDto> getAssignmentsByCourse(UUID courseId, Pageable pageable) {
        log.debug("Fetching assignments for course: {}", courseId);
        Page<Assignment> assignments = assignmentRepository.findByCourseId(courseId, pageable);
        return mapToPageResponse(assignments);
    }

    /**
     * Get published assignments for a course.
     */
    public List<AssignmentDto> getPublishedAssignments(UUID courseId) {
        log.debug("Fetching published assignments for course: {}", courseId);
        List<Assignment> assignments = assignmentRepository.findPublishedByCourse(courseId);
        return assignments.stream()
            .map(mapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Get available assignments (published and within date range).
     */
    public List<AssignmentDto> getAvailableAssignments(UUID courseId) {
        log.debug("Fetching available assignments for course: {}", courseId);
        List<Assignment> assignments = assignmentRepository.findAvailableAssignments(courseId, LocalDateTime.now());
        return assignments.stream()
            .map(mapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Get upcoming assignments.
     */
    public List<AssignmentDto> getUpcomingAssignments(UUID courseId) {
        log.debug("Fetching upcoming assignments for course: {}", courseId);
        List<Assignment> assignments = assignmentRepository.findUpcomingAssignments(courseId, LocalDateTime.now());
        return assignments.stream()
            .map(mapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Get overdue assignments.
     */
    public List<AssignmentDto> getOverdueAssignments(UUID courseId) {
        log.debug("Fetching overdue assignments for course: {}", courseId);
        List<Assignment> assignments = assignmentRepository.findOverdueAssignments(courseId, LocalDateTime.now());
        return assignments.stream()
            .map(mapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Get assignments by module.
     */
    public List<AssignmentDto> getAssignmentsByModule(UUID moduleId) {
        log.debug("Fetching assignments for module: {}", moduleId);
        List<Assignment> assignments = assignmentRepository.findByModuleIdOrderByPositionAsc(moduleId);
        return assignments.stream()
            .map(mapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Get assignments by type.
     */
    public PageResponse<AssignmentDto> getAssignmentsByType(UUID courseId, String type, Pageable pageable) {
        log.debug("Fetching assignments of type {} for course: {}", type, courseId);
        Page<Assignment> assignments = assignmentRepository.findByCourseIdAndAssignmentType(courseId, type, pageable);
        return mapToPageResponse(assignments);
    }

    /**
     * Search assignments.
     */
    public PageResponse<AssignmentDto> searchAssignments(UUID courseId, String query, Pageable pageable) {
        log.debug("Searching assignments in course {}: {}", courseId, query);
        Page<Assignment> assignments = assignmentRepository.searchAssignments(courseId, query, pageable);
        return mapToPageResponse(assignments);
    }

    public List<AssignmentDto> getAssignmentsByCourse(UUID courseId) {
        return assignmentRepository.findByCourseId(courseId).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Create a new assignment.
     */
    @Transactional
    @CacheEvict(value = "assignments", allEntries = true)
    public AssignmentDto createAssignment(CreateAssignmentRequest request, UUID createdBy) {
        log.info("Creating assignment: {} in course: {}", request.getTitle(), request.getCourseId());

        validateAssignmentRequest(request);

        Assignment assignment = mapper.toEntity(request, createdBy);
        Assignment savedAssignment = assignmentRepository.save(assignment);

        log.info("Assignment created successfully with ID: {}", savedAssignment.getId());
        return mapper.toDto(savedAssignment);
    }

    /**
     * Update an assignment.
     */
    @Transactional
    @CacheEvict(value = "assignments", key = "#id")
    public AssignmentDto updateAssignment(UUID id, UpdateAssignmentRequest request, UUID userId) {
        log.info("Updating assignment: {}", id);

        Assignment assignment = findAssignmentById(id);

        // Check permission (must be creator or course instructor)
        if (!assignment.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to update this assignment");
        }

        mapper.updateEntity(assignment, request);
        Assignment updatedAssignment = assignmentRepository.save(assignment);

        log.info("Assignment updated successfully: {}", id);
        return mapper.toDto(updatedAssignment);
    }

    /**
     * Delete an assignment.
     */
    @Transactional
    @CacheEvict(value = "assignments", key = "#id")
    public void deleteAssignment(UUID id, UUID userId) {
        log.info("Deleting assignment: {}", id);

        Assignment assignment = findAssignmentById(id);

        // Check permission
        if (!assignment.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to delete this assignment");
        }

        assignmentRepository.delete(assignment);
        log.info("Assignment deleted successfully: {}", id);
    }

    /**
     * Publish an assignment.
     */
    @Transactional
    @CacheEvict(value = "assignments", key = "#id")
    public AssignmentDto publishAssignment(UUID id, UUID userId) {
        log.info("Publishing assignment: {}", id);

        Assignment assignment = findAssignmentById(id);

        // Check permission
        if (!assignment.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to publish this assignment");
        }

        assignment.setIsPublished(true);
        Assignment updatedAssignment = assignmentRepository.save(assignment);

        log.info("Assignment published successfully: {}", id);
        return mapper.toDto(updatedAssignment);
    }

    /**
     * Unpublish an assignment.
     */
    @Transactional
    @CacheEvict(value = "assignments", key = "#id")
    public AssignmentDto unpublishAssignment(UUID id, UUID userId) {
        log.info("Unpublishing assignment: {}", id);

        Assignment assignment = findAssignmentById(id);

        // Check permission
        if (!assignment.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to unpublish this assignment");
        }

        assignment.setIsPublished(false);
        Assignment updatedAssignment = assignmentRepository.save(assignment);

        log.info("Assignment unpublished successfully: {}", id);
        return mapper.toDto(updatedAssignment);
    }

    /**
     * Archive an assignment.
     */
    @Transactional
    @CacheEvict(value = "assignments", key = "#id")
    public AssignmentDto archiveAssignment(UUID id, UUID userId) {
        log.info("Archiving assignment: {}", id);

        Assignment assignment = findAssignmentById(id);

        // Check permission
        if (!assignment.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to archive this assignment");
        }

        assignment.setIsArchived(true);
        Assignment updatedAssignment = assignmentRepository.save(assignment);

        log.info("Assignment archived successfully: {}", id);
        return mapper.toDto(updatedAssignment);
    }

    /**
     * Duplicate an assignment.
     */
    @Transactional
    public AssignmentDto duplicateAssignment(UUID id, UUID userId) {
        log.info("Duplicating assignment: {}", id);

        Assignment original = findAssignmentById(id);

        // Create a copy
        Assignment copy = Assignment.builder()
            .courseId(original.getCourseId())
            .moduleId(original.getModuleId())
            .categoryId(original.getCategoryId())
            .position(original.getPosition())
            .assignmentType(original.getAssignmentType())
            .title(original.getTitle() + " (Copy)")
            .description(original.getDescription())
            .descriptionFormat(original.getDescriptionFormat())
            .instructions(original.getInstructions())
            .instructionsFormat(original.getInstructionsFormat())
            .resources(original.getResources())
            .starterCode(original.getStarterCode())
            .programmingLanguage(original.getProgrammingLanguage())
            .autoGradingEnabled(original.getAutoGradingEnabled())
            .testCases(original.getTestCases())
            .maxPoints(original.getMaxPoints())
            .rubric(original.getRubric())
            .allowLateSubmission(original.getAllowLateSubmission())
            .latePenaltyPercent(original.getLatePenaltyPercent())
            .submissionTypes(original.getSubmissionTypes())
            .allowedFileTypes(original.getAllowedFileTypes())
            .maxFileSize(original.getMaxFileSize())
            .maxFiles(original.getMaxFiles())
            .gradeAnonymously(original.getGradeAnonymously())
            .peerReviewEnabled(original.getPeerReviewEnabled())
            .peerReviewsRequired(original.getPeerReviewsRequired())
            .tags(original.getTags())
            .estimatedDuration(original.getEstimatedDuration())
            .originalAssignmentId(original.getId())
            .isPublished(false)
            .createdBy(userId)
            .build();

        Assignment savedCopy = assignmentRepository.save(copy);
        log.info("Assignment duplicated successfully: {} -> {}", id, savedCopy.getId());

        return mapper.toDto(savedCopy);
    }

    // Helper methods

    private Assignment findAssignmentById(UUID id) {
        return assignmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", id));
    }

    private void validateAssignmentRequest(CreateAssignmentRequest request) {
        // Validate dates
        if (request.getAvailableFrom() != null && request.getAvailableUntil() != null) {
            if (request.getAvailableUntil().isBefore(request.getAvailableFrom())) {
                throw new ValidationException("Available until date must be after available from date");
            }
        }

        if (request.getAvailableFrom() != null && request.getDueDate() != null) {
            if (request.getDueDate().isBefore(request.getAvailableFrom())) {
                throw new ValidationException("Due date must be after available from date");
            }
        }

        // Validate assignment type specific requirements
        if ("CODE".equals(request.getAssignmentType()) && request.getProgrammingLanguage() == null) {
            throw new ValidationException("Programming language is required for CODE assignments");
        }

        if ("QUIZ".equals(request.getAssignmentType()) && request.getQuizId() == null) {
            throw new ValidationException("Quiz ID is required for QUIZ assignments");
        }

        if ("EXTERNAL".equals(request.getAssignmentType()) && request.getExternalToolUrl() == null) {
            throw new ValidationException("External tool URL is required for EXTERNAL assignments");
        }
    }

    private PageResponse<AssignmentDto> mapToPageResponse(Page<Assignment> page) {
        return PageResponse.<AssignmentDto>builder()
            .content(page.getContent().stream().map(mapper::toDto).toList())
            .pageNumber(page.getNumber())
            .pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }
}
