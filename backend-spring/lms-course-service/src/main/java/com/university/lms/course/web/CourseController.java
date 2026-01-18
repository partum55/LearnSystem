package com.university.lms.course.web;

import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.course.dto.*;
import com.university.lms.course.service.CourseService;
import com.university.lms.course.service.EnrollmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for course management.
 */
@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
@Slf4j
public class CourseController {

    private final CourseService courseService;
    private final EnrollmentService enrollmentService;
    private final HttpServletRequest request;

    /**
     * Get all courses with pagination.
     */
    @GetMapping({"", "/"})
    public ResponseEntity<PageResponse<CourseDto>> getAllCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        PageResponse<CourseDto> courses = courseService.getAllCourses(pageable);
        return ResponseEntity.ok(courses);
    }

    /**
     * Get published courses.
     */
    @GetMapping("/published")
    public ResponseEntity<PageResponse<CourseDto>> getPublishedCourses(
            @RequestParam(required = false) CourseVisibility visibility,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (visibility != null) {
            PageResponse<CourseDto> courses = courseService.getPublishedCourses(visibility, pageable);
            return ResponseEntity.ok(courses);
        } else {
            PageResponse<CourseDto> courses = courseService.getActiveCourses(pageable);
            return ResponseEntity.ok(courses);
        }
    }

    /**
     * Search courses.
     */
    @GetMapping("/search")
    public ResponseEntity<PageResponse<CourseDto>> searchCourses(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageResponse<CourseDto> courses = courseService.searchCourses(q, pageable);
        return ResponseEntity.ok(courses);
    }

    /**
     * Get my courses (courses where user is enrolled).
     */
    @GetMapping("/my")
    public ResponseEntity<PageResponse<CourseDto>> getMyCourses(
            Authentication authentication,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID userId = extractUserId(authentication);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        PageResponse<CourseDto> courses;
        if (role != null) {
            courses = courseService.getCoursesForUserByRole(userId, role, pageable);
        } else {
            courses = courseService.getCoursesForUser(userId, pageable);
        }

        return ResponseEntity.ok(courses);
    }

    /**
     * Get courses by owner.
     */
    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<PageResponse<CourseDto>> getCoursesByOwner(
            @PathVariable UUID ownerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        PageResponse<CourseDto> courses = courseService.getCoursesByOwner(ownerId, pageable);
        return ResponseEntity.ok(courses);
    }

    /**
     * Get course by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable UUID id) {
        CourseDto course = courseService.getCourseById(id);
        return ResponseEntity.ok(course);
    }

    /**
     * Get course by code.
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<CourseDto> getCourseByCode(@PathVariable String code) {
        CourseDto course = courseService.getCourseByCode(code);
        return ResponseEntity.ok(course);
    }

    /**
     * Create a new course.
     */
    @PostMapping
    public ResponseEntity<CourseDto> createCourse(
            @Valid @RequestBody CreateCourseRequest request,
            Authentication authentication) {

        UUID ownerId = extractUserId(authentication);
        CourseDto course = courseService.createCourse(request, ownerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(course);
    }

    /**
     * Update a course.
     */
    @PutMapping("/{id}")
    public ResponseEntity<CourseDto> updateCourse(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCourseRequest request,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        CourseDto course = courseService.updateCourse(id, request, userId);
        return ResponseEntity.ok(course);
    }

    /**
     * Delete a course.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable UUID id, Authentication authentication) {
        UUID userId = extractUserId(authentication);
        courseService.deleteCourse(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Publish a course.
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<CourseDto> publishCourse(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        CourseDto course = courseService.publishCourse(id, userId);
        return ResponseEntity.ok(course);
    }

    /**
     * Unpublish a course.
     */
    @PostMapping("/{id}/unpublish")
    public ResponseEntity<CourseDto> unpublishCourse(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        CourseDto course = courseService.unpublishCourse(id, userId);
        return ResponseEntity.ok(course);
    }

    /**
     * Enroll user in course.
     */
    @PostMapping("/{courseId}/enroll")
    public ResponseEntity<CourseMemberDto> enrollUser(
            @PathVariable UUID courseId,
            @Valid @RequestBody EnrollUserRequest request,
            Authentication authentication) {

        UUID enrolledBy = extractUserId(authentication);
        CourseMemberDto member = enrollmentService.enrollUser(courseId, request, enrolledBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    /**
     * Unenroll user from course.
     */
    @DeleteMapping("/{courseId}/enroll/{userId}")
    public ResponseEntity<Void> unenrollUser(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            Authentication authentication) {

        UUID requestedBy = extractUserId(authentication);
        enrollmentService.unenrollUser(courseId, userId, requestedBy);
        return ResponseEntity.noContent().build();
    }

    /**
     * Drop enrollment (student self-drop).
     */
    @PostMapping("/{courseId}/drop")
    public ResponseEntity<Void> dropEnrollment(
            @PathVariable UUID courseId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        enrollmentService.dropEnrollment(courseId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get course members.
     */
    @GetMapping("/{courseId}/members")
    public ResponseEntity<PageResponse<CourseMemberDto>> getCourseMembers(
            @PathVariable UUID courseId,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "addedAt"));

        PageResponse<CourseMemberDto> members;
        if (role != null) {
            members = enrollmentService.getCourseMembers(courseId, role, pageable);
        } else {
            members = enrollmentService.getCourseMembers(courseId, pageable);
        }

        return ResponseEntity.ok(members);
    }

    /**
     * Get user's enrollment in course.
     */
    @GetMapping("/{courseId}/enrollment")
    public ResponseEntity<CourseMemberDto> getMyEnrollment(
            @PathVariable UUID courseId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        CourseMemberDto member = enrollmentService.getEnrollment(courseId, userId);
        return ResponseEntity.ok(member);
    }

    /**
     * Check if user is enrolled.
     */
    @GetMapping("/{courseId}/enrollment/check")
    public ResponseEntity<Boolean> checkEnrollment(
            @PathVariable UUID courseId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        boolean enrolled = enrollmentService.isUserEnrolled(courseId, userId);
        return ResponseEntity.ok(enrolled);
    }

    /**
     * Get student IDs by course ID.
     */
    @GetMapping("/{id}/students")
    public ResponseEntity<java.util.List<Long>> getStudentIdsByCourseId(@PathVariable UUID id) {
        return ResponseEntity.ok(enrollmentService.getStudentIdsByCourseId(id));
    }

    // Helper method to extract user ID from request attribute (set by JwtAuthenticationFilter)
    private UUID extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }
        // userId is set as request attribute by JwtAuthenticationFilter
        Object userId = request.getAttribute("userId");
        if (userId instanceof UUID) {
            return (UUID) userId;
        }
        throw new RuntimeException("User ID not found in request");
    }
}
