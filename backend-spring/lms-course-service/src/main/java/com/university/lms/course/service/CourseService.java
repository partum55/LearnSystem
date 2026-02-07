package com.university.lms.course.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.dto.*;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for managing courses.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final CourseMapper courseMapper;

    /**
     * Get course by ID.
     */
    @Cacheable(value = "courses", key = "#id")
    public CourseDto getCourseById(UUID id, UUID userId, String userRole) {
        log.debug("Fetching course by ID: {}", id);
        Course course = findCourseById(id);
        enforceCourseVisibility(course, userId, userRole);
        return courseMapper.toDto(course);
    }

    /**
     * Get course by code.
     */
    @Cacheable(value = "courses", key = "#code")
    public CourseDto getCourseByCode(String code) {
        log.debug("Fetching course by code: {}", code);
        Course course = courseRepository.findByCode(code)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "code", code));
        return courseMapper.toDto(course);
    }

    /**
     * Get all courses with pagination.
     */
    public PageResponse<CourseDto> getAllCourses(Pageable pageable) {
        log.debug("Fetching all courses with pagination");
        Page<Course> coursePage = courseRepository.findAll(pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Get published courses.
     */
    public PageResponse<CourseDto> getPublishedCourses(CourseVisibility visibility, Pageable pageable) {
        log.debug("Fetching published courses with visibility: {}", visibility);
        Page<Course> coursePage = courseRepository.findByIsPublishedTrueAndVisibility(visibility, pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Get active courses.
     */
    public PageResponse<CourseDto> getActiveCourses(Pageable pageable) {
        log.debug("Fetching active courses");
        Page<Course> coursePage = courseRepository.findActiveCourses(pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Search courses by term.
     */
    public PageResponse<CourseDto> searchCourses(String searchTerm, Pageable pageable) {
        log.debug("Searching courses with term: {}", searchTerm);
        Page<Course> coursePage = courseRepository.searchCourses(searchTerm, pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Get courses by owner.
     */
    public PageResponse<CourseDto> getCoursesByOwner(UUID ownerId, Pageable pageable) {
        log.debug("Fetching courses for owner: {}", ownerId);
        Page<Course> coursePage = courseRepository.findByOwnerId(ownerId, pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Get courses for user (enrolled courses).
     */
    public PageResponse<CourseDto> getCoursesForUser(UUID userId, Pageable pageable) {
        log.debug("Fetching courses for user: {}", userId);
        Page<Course> coursePage = courseRepository.findCoursesForUser(userId, pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Get courses for user by role.
     */
    public PageResponse<CourseDto> getCoursesForUserByRole(UUID userId, String role, Pageable pageable) {
        log.debug("Fetching courses for user: {} with role: {}", userId, role);
        Page<Course> coursePage = courseRepository.findCoursesForUserByRole(userId, role, pageable);
        return mapToPageResponse(coursePage);
    }

    /**
     * Create a new course.
     */
    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseDto createCourse(CreateCourseRequest request, UUID ownerId) {
        log.info("Creating new course with code: {} by owner: {}", request.getCode(), ownerId);

        // Validate course code uniqueness
        if (courseRepository.existsByCode(request.getCode())) {
            throw new ValidationException("Course with code '" + request.getCode() + "' already exists");
        }

        // Validate dates
        if (request.getStartDate() != null && request.getEndDate() != null) {
            if (request.getEndDate().isBefore(request.getStartDate())) {
                throw new ValidationException("End date must be after start date");
            }
        }

        Course course = courseMapper.toEntity(request, ownerId);
        Course savedCourse = courseRepository.save(course);

        // Automatically add owner as TEACHER
        addCourseMember(savedCourse, ownerId, "TEACHER", ownerId);

        log.info("Course created successfully with ID: {}", savedCourse.getId());
        return courseMapper.toDto(savedCourse);
    }

    /**
     * Update a course.
     */
    @Transactional
    @CacheEvict(value = "courses", key = "#id")
    public CourseDto updateCourse(UUID id, UpdateCourseRequest request, UUID userId, String userRole) {
        log.info("Updating course: {} by user: {}", id, userId);

        Course course = findCourseById(id);

        // Check permissions
        if (!canUserManageCourse(course, userId, userRole)) {
            throw new ValidationException("User does not have permission to update this course");
        }

        // Validate dates if both are provided
        if (request.getStartDate() != null && request.getEndDate() != null) {
            if (request.getEndDate().isBefore(request.getStartDate())) {
                throw new ValidationException("End date must be after start date");
            }
        }

        courseMapper.updateEntityFromDto(course, request);
        Course updatedCourse = courseRepository.save(course);

        log.info("Course updated successfully: {}", id);
        return courseMapper.toDto(updatedCourse);
    }

    /**
     * Delete a course.
     */
    @Transactional
    @CacheEvict(value = "courses", key = "#id")
    public void deleteCourse(UUID id, UUID userId, String userRole) {
        log.info("Deleting course: {} by user: {}", id, userId);

        Course course = findCourseById(id);

        // Owner and SUPERADMIN can delete
        if (!course.getOwnerId().equals(userId) && !isSuperAdmin(userRole)) {
            throw new ValidationException("Only course owner or SUPERADMIN can delete the course");
        }

        courseRepository.delete(course);
        log.info("Course deleted successfully: {}", id);
    }

    /**
     * Publish a course.
     */
    @Transactional
    @CacheEvict(value = "courses", key = "#id")
    public CourseDto publishCourse(UUID id, UUID userId, String userRole) {
        log.info("Publishing course: {} by user: {}", id, userId);

        Course course = findCourseById(id);

        if (!canUserManageCourse(course, userId, userRole)) {
            throw new ValidationException("User does not have permission to publish this course");
        }

        course.setIsPublished(true);
        course.setStatus(CourseStatus.PUBLISHED);
        Course updatedCourse = courseRepository.save(course);

        log.info("Course published successfully: {}", id);
        return courseMapper.toDto(updatedCourse);
    }

    /**
     * Unpublish a course.
     */
    @Transactional
    @CacheEvict(value = "courses", key = "#id")
    public CourseDto unpublishCourse(UUID id, UUID userId, String userRole) {
        log.info("Unpublishing course: {} by user: {}", id, userId);

        Course course = findCourseById(id);

        if (!canUserManageCourse(course, userId, userRole)) {
            throw new ValidationException("User does not have permission to unpublish this course");
        }

        course.setIsPublished(false);
        course.setStatus(CourseStatus.DRAFT);
        Course updatedCourse = courseRepository.save(course);

        log.info("Course unpublished successfully: {}", id);
        return courseMapper.toDto(updatedCourse);
    }

    // Helper methods

    private Course findCourseById(UUID id) {
        return courseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
    }

    private boolean canUserManageCourse(Course course, UUID userId, String userRole) {
        if (isSuperAdmin(userRole)) {
            return true;
        }

        // Owner can always manage
        if (course.getOwnerId().equals(userId)) {
            return true;
        }
        // Check if user is TEACHER or TA
        return courseMemberRepository.canUserManageCourse(course.getId(), userId);
    }

    private void enforceCourseVisibility(Course course, UUID userId, String userRole) {
        boolean isAdmin = isSuperAdmin(userRole);
        boolean canManage = canUserManageCourse(course, userId, userRole);

        if (course.getIsPublished()) {
            return;
        }

        if (!isAdmin && !canManage) {
            throw new ValidationException("Course is not available");
        }
    }

    private boolean isSuperAdmin(String userRole) {
        return "SUPERADMIN".equals(userRole);
    }

    private void addCourseMember(Course course, UUID userId, String role, UUID addedBy) {
        CourseMember member = CourseMember.builder()
            .course(course)
            .userId(userId)
            .roleInCourse(role)
            .addedBy(addedBy)
            .enrollmentStatus("active")
            .build();
        courseMemberRepository.save(member);
    }

    private PageResponse<CourseDto> mapToPageResponse(Page<Course> page) {
        return PageResponse.<CourseDto>builder()
            .content(page.getContent().stream().map(courseMapper::toDto).toList())
            .pageNumber(page.getNumber())
            .pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }
}
