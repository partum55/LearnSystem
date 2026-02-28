package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.document.domain.AssignmentTemplateDocument;
import com.university.lms.course.assessment.document.repository.AssignmentTemplateDocumentRepository;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.dto.AssignmentDto;
import com.university.lms.course.assessment.dto.CreateAssignmentRequest;
import com.university.lms.course.assessment.dto.InlineQuizRequest;
import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.dto.UpdateAssignmentRequest;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
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
    private final ModuleRepository moduleRepository;
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final AssignmentTemplateDocumentRepository assignmentTemplateDocumentRepository;
    private final QuizService quizService;
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
        validateModuleForCourse(request.getCourseId(), request.getModuleId());
        UUID resolvedQuizId = resolveQuizForCreate(request, createdBy);

        Assignment assignment = mapper.toEntity(request, createdBy);
        if (resolvedQuizId != null) {
            assignment.setQuizId(resolvedQuizId);
        }
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

        if (request.getModuleId() != null) {
            validateModuleForCourse(assignment.getCourseId(), request.getModuleId());
        }

        validateQuizUpdateRequest(assignment, request, userId);
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
    public AssignmentDto duplicateAssignment(
        UUID id, UUID userId, String userRole, UUID targetCourseId, UUID targetModuleId) {
        log.info("Duplicating assignment {} to course {} module {}", id, targetCourseId, targetModuleId);

        Assignment original = findAssignmentById(id);
        ensureCanDuplicateAssignment(original, userId, userRole);

        UUID resolvedCourseId = targetCourseId != null ? targetCourseId : original.getCourseId();
        ensureCanManageCourse(resolvedCourseId, userId, userRole);

        UUID resolvedModuleId = resolveTargetModuleId(original, resolvedCourseId, targetModuleId);
        if ("QUIZ".equals(original.getAssignmentType()) && resolvedModuleId == null) {
            throw new ValidationException("Target module is required when duplicating QUIZ assignments");
        }

        UUID resolvedQuizId = null;
        if ("QUIZ".equals(original.getAssignmentType()) && original.getQuizId() != null) {
            QuizDto duplicatedQuiz =
                quizService.duplicateQuiz(
                    original.getQuizId(), userId, userRole, resolvedCourseId, true);
            resolvedQuizId = duplicatedQuiz.getId();
        }

        Assignment copy = Assignment.builder()
            .courseId(resolvedCourseId)
            .moduleId(resolvedModuleId)
            .categoryId(resolvedCourseId.equals(original.getCourseId()) ? original.getCategoryId() : null)
            .position(original.getPosition())
            .assignmentType(original.getAssignmentType())
            .title(buildCopyTitle(original.getTitle()))
            .description(original.getDescription())
            .descriptionFormat(original.getDescriptionFormat())
            .instructions(original.getInstructions())
            .instructionsFormat(original.getInstructionsFormat())
            .resources(copyResourceList(original.getResources()))
            .starterCode(original.getStarterCode())
            .solutionCode(original.getSolutionCode())
            .programmingLanguage(original.getProgrammingLanguage())
            .autoGradingEnabled(Boolean.TRUE.equals(original.getAutoGradingEnabled()))
            .testCases(copyResourceList(original.getTestCases()))
            .maxPoints(original.getMaxPoints() != null ? original.getMaxPoints() : BigDecimal.valueOf(100.00))
            .rubric(copyMap(original.getRubric()))
            .dueDate(original.getDueDate())
            .availableFrom(original.getAvailableFrom())
            .availableUntil(original.getAvailableUntil())
            .allowLateSubmission(Boolean.TRUE.equals(original.getAllowLateSubmission()))
            .latePenaltyPercent(original.getLatePenaltyPercent() != null ? original.getLatePenaltyPercent() : BigDecimal.ZERO)
            .submissionTypes(copyStringList(original.getSubmissionTypes()))
            .allowedFileTypes(copyStringList(original.getAllowedFileTypes()))
            .maxFileSize(original.getMaxFileSize())
            .maxFiles(original.getMaxFiles())
            .quizId(resolvedQuizId)
            .externalToolUrl(original.getExternalToolUrl())
            .externalToolConfig(copyMap(original.getExternalToolConfig()))
            .gradeAnonymously(Boolean.TRUE.equals(original.getGradeAnonymously()))
            .peerReviewEnabled(Boolean.TRUE.equals(original.getPeerReviewEnabled()))
            .peerReviewsRequired(original.getPeerReviewsRequired())
            .tags(copyStringList(original.getTags()))
            .estimatedDuration(original.getEstimatedDuration())
            .isTemplate(Boolean.TRUE.equals(original.getIsTemplate()))
            .isArchived(false)
            .originalAssignmentId(original.getId())
            .isPublished(false)
            .createdBy(userId)
            .build();

        Assignment savedCopy = assignmentRepository.save(copy);
        cloneTemplateDocumentIfPresent(original.getId(), savedCopy.getId(), userId);

        log.info("Assignment duplicated successfully: {} -> {}", id, savedCopy.getId());
        return mapper.toDto(savedCopy);
    }

    // Helper methods

    private Assignment findAssignmentById(UUID id) {
        return assignmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", id));
    }

    private void ensureCanDuplicateAssignment(Assignment assignment, UUID userId, String userRole) {
        if (isSuperAdmin(userRole)
            || assignment.getCreatedBy().equals(userId)
            || courseMemberRepository.canUserManageCourse(assignment.getCourseId(), userId)) {
            return;
        }
        throw new ValidationException("You don't have permission to duplicate this assignment");
    }

    private void ensureCanManageCourse(UUID courseId, UUID userId, String userRole) {
        Course course = courseRepository
            .findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
        if (isSuperAdmin(userRole)
            || course.getOwnerId().equals(userId)
            || courseMemberRepository.canUserManageCourse(courseId, userId)) {
            return;
        }
        throw new ValidationException("You don't have permission to duplicate content to the selected course");
    }

    private boolean isSuperAdmin(String userRole) {
        return "SUPERADMIN".equalsIgnoreCase(userRole);
    }

    private UUID resolveTargetModuleId(Assignment original, UUID targetCourseId, UUID targetModuleId) {
        if (targetModuleId != null) {
            validateModuleForCourse(targetCourseId, targetModuleId);
            return targetModuleId;
        }

        if (targetCourseId.equals(original.getCourseId())) {
            return original.getModuleId();
        }

        if (original.getModuleId() == null) {
            return null;
        }

        throw new ValidationException("Target module is required when duplicating to another course");
    }

    private void cloneTemplateDocumentIfPresent(UUID sourceAssignmentId, UUID targetAssignmentId, UUID userId) {
        assignmentTemplateDocumentRepository.findById(sourceAssignmentId).ifPresent(template -> {
            AssignmentTemplateDocument cloned =
                AssignmentTemplateDocument.builder()
                    .assignmentId(targetAssignmentId)
                    .docJson(copyMap(template.getDocJson()))
                    .schemaVersion(template.getSchemaVersion())
                    .updatedBy(userId)
                    .build();
            assignmentTemplateDocumentRepository.save(cloned);
        });
    }

    private String buildCopyTitle(String originalTitle) {
        if (originalTitle == null || originalTitle.isBlank()) {
            return "Untitled (Copy)";
        }
        return originalTitle + " (Copy)";
    }

    private List<Map<String, Object>> copyResourceList(List<Map<String, Object>> source) {
        if (source == null) {
            return new ArrayList<>();
        }
        return source.stream().map(this::copyMap).collect(Collectors.toList());
    }

    private List<String> copyStringList(List<String> source) {
        return source == null ? new ArrayList<>() : new ArrayList<>(source);
    }

    private Map<String, Object> copyMap(Map<String, Object> source) {
        return source == null ? new HashMap<>() : new HashMap<>(source);
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

        if ("QUIZ".equals(request.getAssignmentType())) {
            if (request.getModuleId() == null) {
                throw new ValidationException("Module ID is required for QUIZ assignments");
            }
            if (request.getQuizId() != null && request.getQuiz() != null) {
                throw new ValidationException("Provide either quizId or inline quiz payload, not both");
            }
        } else if (request.getQuizId() != null || request.getQuiz() != null) {
            throw new ValidationException("quizId/quiz payload is supported only for QUIZ assignments");
        }

        if ("EXTERNAL".equals(request.getAssignmentType()) && request.getExternalToolUrl() == null) {
            throw new ValidationException("External tool URL is required for EXTERNAL assignments");
        }
    }

    private UUID resolveQuizForCreate(CreateAssignmentRequest request, UUID createdBy) {
        if (!"QUIZ".equals(request.getAssignmentType())) {
            return request.getQuizId();
        }

        UUID moduleId = request.getModuleId();
        if (moduleId == null) {
            throw new ValidationException("Module ID is required for QUIZ assignments");
        }

        if (request.getQuizId() != null) {
            validateQuizForCourseAndModule(request.getQuizId(), request.getCourseId(), moduleId);
            return request.getQuizId();
        }

        InlineQuizRequest inlineQuiz = request.getQuiz();
        if (inlineQuiz == null) {
            inlineQuiz = InlineQuizRequest.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .build();
        }

        QuizDto createdQuiz = createInlineQuizForAssignment(
                request.getCourseId(),
                moduleId,
                inlineQuiz,
                request.getTitle(),
                createdBy
        );
        return createdQuiz.getId();
    }

    private void validateQuizUpdateRequest(Assignment assignment, UpdateAssignmentRequest request, UUID userId) {
        boolean isQuizAssignment = "QUIZ".equals(assignment.getAssignmentType());
        UUID effectiveModuleId = request.getModuleId() != null ? request.getModuleId() : assignment.getModuleId();

        if (request.getQuizId() != null && request.getQuiz() != null) {
            throw new ValidationException("Provide either quizId or inline quiz payload, not both");
        }

        if (!isQuizAssignment && request.getQuiz() != null) {
            throw new ValidationException("Inline quiz payload is supported only for QUIZ assignments");
        }
        if (!isQuizAssignment && request.getQuizId() != null) {
            throw new ValidationException("quizId is supported only for QUIZ assignments");
        }

        if (!isQuizAssignment) {
            return;
        }

        if (effectiveModuleId == null) {
            throw new ValidationException("Module ID is required for QUIZ assignments");
        }

        UUID currentQuizId = assignment.getQuizId();
        if (request.getQuizId() != null) {
            validateQuizForCourseAndModule(request.getQuizId(), assignment.getCourseId(), effectiveModuleId);
            currentQuizId = request.getQuizId();
        }

        if (request.getQuiz() != null) {
            if (currentQuizId == null) {
                QuizDto createdQuiz = createInlineQuizForAssignment(
                        assignment.getCourseId(),
                        effectiveModuleId,
                        request.getQuiz(),
                        assignment.getTitle(),
                        userId
                );
                request.setQuizId(createdQuiz.getId());
            } else {
                quizService.updateQuizFromAssignment(currentQuizId, request.getQuiz(), userId);
                request.setQuizId(currentQuizId);
            }
        }

    }

    private QuizDto createInlineQuizForAssignment(
            UUID courseId,
            UUID moduleId,
            InlineQuizRequest request,
            String assignmentTitle,
            UUID createdBy
    ) {
        String fallbackTitle = assignmentTitle != null && !assignmentTitle.isBlank()
                ? assignmentTitle
                : "Module Quiz";
        return quizService.createQuizForAssignment(courseId, moduleId, request, fallbackTitle, createdBy);
    }

    private void validateModuleForCourse(UUID courseId, UUID moduleId) {
        if (moduleId == null) {
            return;
        }

        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", moduleId));
        if (!module.getCourse().getId().equals(courseId)) {
            throw new ValidationException("Module does not belong to the selected course");
        }
    }

    private void validateQuizForCourseAndModule(UUID quizId, UUID courseId, UUID moduleId) {
        QuizDto quiz = quizService.getQuizById(quizId);
        if (!courseId.equals(quiz.getCourseId())) {
            throw new ValidationException("Quiz does not belong to the selected course");
        }
        if (quiz.getModuleId() != null && !moduleId.equals(quiz.getModuleId())) {
            throw new ValidationException("Quiz is linked to a different module");
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
