package com.university.lms.course.service;

import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.Module;
import com.university.lms.course.dto.CreateModuleRequest;
import com.university.lms.course.dto.ModuleDto;
import com.university.lms.course.dto.UpdateModuleRequest;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing course modules.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final CourseMapper courseMapper;

    /**
     * Get all modules for a course.
     */
    @Cacheable(value = "modules", key = "#courseId")
    public List<ModuleDto> getModulesByCourse(UUID courseId, UUID userId) {
        log.debug("Fetching modules for course: {}", courseId);

        Course course = findCourseById(courseId);

        // Check if user can view modules
        boolean canManage = canUserManageCourse(course, userId);

        List<Module> modules;
        if (canManage) {
            // Teachers/TAs see all modules
            modules = moduleRepository.findByCourseIdOrderByPositionAsc(courseId);
        } else {
            // Students see only published modules
            modules = moduleRepository.findPublishedModulesByCourse(courseId);
        }

        return modules.stream()
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get module by ID.
     */
    @Cacheable(value = "modules", key = "#id")
    public ModuleDto getModuleById(UUID id, UUID userId) {
        log.debug("Fetching module by ID: {}", id);

        Module module = findModuleById(id);

        // Check permissions
        if (!module.getIsPublished() && !canUserManageCourse(module.getCourse(), userId)) {
            throw new ValidationException("Module is not published");
        }

        return courseMapper.toDto(module);
    }

    /**
     * Create a new module.
     */
    @Transactional
    @CacheEvict(value = "modules", key = "#courseId")
    public ModuleDto createModule(UUID courseId, CreateModuleRequest request, UUID userId) {
        log.info("Creating module for course: {}", courseId);

        Course course = findCourseById(courseId);

        // Check permissions
        if (!canUserManageCourse(course, userId)) {
            throw new ValidationException("User does not have permission to create modules");
        }

        // Get next position
        Integer maxPosition = moduleRepository.findMaxPositionByCourse(courseId);
        Integer nextPosition = (maxPosition != null) ? maxPosition + 1 : 0;

        Module module = Module.builder()
                .course(course)
                .title(request.getTitle())
                .description(request.getDescription())
                .position(request.getPosition() != null ? request.getPosition() : nextPosition)
                .contentMeta(request.getContentMeta())
                .isPublished(request.getIsPublished() != null ? request.getIsPublished() : false)
                .publishDate(request.getPublishDate())
                .build();

        Module savedModule = moduleRepository.save(module);
        log.info("Module created successfully with ID: {}", savedModule.getId());

        return courseMapper.toDto(savedModule);
    }

    /**
     * Update a module.
     */
    @Transactional
    @CacheEvict(value = "modules", key = "#id")
    public ModuleDto updateModule(UUID id, UpdateModuleRequest request, UUID userId) {
        log.info("Updating module: {}", id);

        Module module = findModuleById(id);

        // Check permissions
        if (!canUserManageCourse(module.getCourse(), userId)) {
            throw new ValidationException("User does not have permission to update this module");
        }

        // Update fields
        if (request.getTitle() != null) module.setTitle(request.getTitle());
        if (request.getDescription() != null) module.setDescription(request.getDescription());
        if (request.getPosition() != null) module.setPosition(request.getPosition());
        if (request.getContentMeta() != null) module.setContentMeta(request.getContentMeta());
        if (request.getIsPublished() != null) module.setIsPublished(request.getIsPublished());
        if (request.getPublishDate() != null) module.setPublishDate(request.getPublishDate());

        Module updatedModule = moduleRepository.save(module);
        log.info("Module updated successfully: {}", id);

        return courseMapper.toDto(updatedModule);
    }

    /**
     * Delete a module.
     */
    @Transactional
    @CacheEvict(value = "modules", key = "#id")
    public void deleteModule(UUID id, UUID userId) {
        log.info("Deleting module: {}", id);

        Module module = findModuleById(id);

        // Check permissions
        if (!canUserManageCourse(module.getCourse(), userId)) {
            throw new ValidationException("User does not have permission to delete this module");
        }

        moduleRepository.delete(module);
        log.info("Module deleted successfully: {}", id);
    }

    /**
     * Reorder modules.
     */
    @Transactional
    @CacheEvict(value = "modules", allEntries = true)
    public void reorderModules(UUID courseId, List<UUID> moduleIds, UUID userId) {
        log.info("Reordering modules for course: {}", courseId);

        Course course = findCourseById(courseId);

        // Check permissions
        if (!canUserManageCourse(course, userId)) {
            throw new ValidationException("User does not have permission to reorder modules");
        }

        // Update positions
        for (int i = 0; i < moduleIds.size(); i++) {
            Module module = findModuleById(moduleIds.get(i));
            if (!module.getCourse().getId().equals(courseId)) {
                throw new ValidationException("Module does not belong to this course");
            }
            module.setPosition(i);
            moduleRepository.save(module);
        }

        log.info("Modules reordered successfully for course: {}", courseId);
    }

    /**
     * Publish a module.
     */
    @Transactional
    @CacheEvict(value = "modules", key = "#id")
    public ModuleDto publishModule(UUID id, UUID userId) {
        log.info("Publishing module: {}", id);

        Module module = findModuleById(id);

        // Check permissions
        if (!canUserManageCourse(module.getCourse(), userId)) {
            throw new ValidationException("User does not have permission to publish this module");
        }

        module.setIsPublished(true);
        Module updatedModule = moduleRepository.save(module);

        log.info("Module published successfully: {}", id);
        return courseMapper.toDto(updatedModule);
    }

    /**
     * Unpublish a module.
     */
    @Transactional
    @CacheEvict(value = "modules", key = "#id")
    public ModuleDto unpublishModule(UUID id, UUID userId) {
        log.info("Unpublishing module: {}", id);

        Module module = findModuleById(id);

        // Check permissions
        if (!canUserManageCourse(module.getCourse(), userId)) {
            throw new ValidationException("User does not have permission to unpublish this module");
        }

        module.setIsPublished(false);
        Module updatedModule = moduleRepository.save(module);

        log.info("Module unpublished successfully: {}", id);
        return courseMapper.toDto(updatedModule);
    }

    // Helper methods

    private Course findCourseById(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
    }

    private Module findModuleById(UUID id) {
        return moduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", id));
    }

    private boolean canUserManageCourse(Course course, UUID userId) {
        if (course.getOwnerId().equals(userId)) {
            return true;
        }
        return courseMemberRepository.canUserManageCourse(course.getId(), userId);
    }
}

